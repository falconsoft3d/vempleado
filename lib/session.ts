import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getEmployee, OdooError, SessionExpiredError } from "./odoo";

const SESSION_COOKIE = "vportal_session";
const URL_COOKIE = "vportal_url";
// Igual que la validez del token emitido por Odoo (BIM_PORTAL_TOKEN_TTL)
const SESSION_MAX_AGE = 8 * 60 * 60;

export type Session = { url: string; token: string };

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const session = JSON.parse(Buffer.from(raw, "base64url").toString());
    return typeof session?.url === "string" && typeof session?.token === "string" ? session : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: Session) {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  store.set(SESSION_COOKIE, Buffer.from(JSON.stringify(session)).toString("base64url"), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  // Recuerda la última URL usada para rellenar el login
  store.set(URL_COOKIE, session.url, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 365 * 24 * 60 * 60 });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getLastUrl() {
  return (await cookies()).get(URL_COOKIE)?.value ?? process.env.ODOO_URL ?? "";
}

/** Empleado de la sesión actual; redirige al login si no hay sesión o ha caducado. */
export const requireEmployee = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/login");

  let reason: string;
  try {
    const { employee } = await getEmployee(session.url, session.token);
    return { session, employee };
  } catch (error) {
    if (!(error instanceof OdooError)) throw error;
    reason = error instanceof SessionExpiredError ? "expired" : "unreachable";
  }
  redirect(`/login?reason=${reason}`);
});
