"use server";

import { redirect } from "next/navigation";
import * as odoo from "@/lib/odoo";
import { clearSession, getSession, saveSession } from "@/lib/session";

export type FormState = { error?: string; success?: string };

const MIN_PASSWORD_LENGTH = 8;

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const rawUrl = String(formData.get("url") ?? "");
  const login = String(formData.get("login") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!rawUrl || !login || !password) return { error: "Completa la URL, el usuario y la contraseña." };

  let url: string;
  try {
    url = odoo.normalizeOdooUrl(rawUrl);
  } catch {
    return { error: "La URL de Odoo no es válida." };
  }

  try {
    const { token } = await odoo.login(url, login, password);
    await saveSession({ url, token });
  } catch (error) {
    if (error instanceof odoo.OdooError) return { error: error.message };
    throw error;
  }
  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("new") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current || !next) return { error: "Completa todos los campos." };
  if (next.length < MIN_PASSWORD_LENGTH)
    return { error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  if (next !== confirm) return { error: "Las contraseñas nuevas no coinciden." };
  if (next === current) return { error: "La nueva contraseña debe ser distinta de la actual." };

  try {
    const { token } = await odoo.changePassword(session.url, session.token, current, next);
    await saveSession({ url: session.url, token });
  } catch (error) {
    if (error instanceof odoo.SessionExpiredError) {
      await clearSession();
      redirect("/login?reason=expired");
    }
    if (error instanceof odoo.OdooError) return { error: error.message };
    throw error;
  }
  return { success: "Contraseña actualizada correctamente." };
}

type ActionResult<T> = ({ ok: true } & T) | { ok: false; error: string };

/** Ejecuta una llamada a Odoo con la sesión actual; si caducó, vuelve al login. */
async function withSession<T>(fn: (session: { url: string; token: string }) => Promise<T>): Promise<ActionResult<T>> {
  const session = await getSession();
  if (!session) redirect("/login");
  try {
    return { ok: true, ...(await fn(session)) };
  } catch (error) {
    if (error instanceof odoo.SessionExpiredError) {
      await clearSession();
      redirect("/login?reason=expired");
    }
    if (error instanceof odoo.OdooError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function loadImputationAction(employeeIds: number[], dateFrom: string, dateTo: string) {
  return withSession((s) => odoo.loadImputations(s.url, s.token, employeeIds, dateFrom, dateTo));
}

export async function saveImputationAction(rows: odoo.ImputationRow[]) {
  return withSession((s) => odoo.saveImputations(s.url, s.token, rows));
}

export async function dashboardDetailAction(
  projectId: number,
  dateFrom: string,
  dateTo: string,
  employeeIds: number[],
  departmentId: number | null,
  jobId: number | null,
) {
  return withSession((s) =>
    odoo.getDashboardDetail(s.url, s.token, projectId, dateFrom, dateTo, employeeIds, departmentId, jobId),
  );
}
