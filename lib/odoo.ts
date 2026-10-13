import "server-only";

export type Employee = {
  id: number;
  name: string;
  bim_user: string;
  job_title: string | null;
  department: string | null;
  parent: string | null;
  company: string | null;
  work_email: string | null;
  work_phone: string | null;
  mobile_phone: string | null;
  image: string | null;
};

type PortalResult<T> = ({ status: "ok" } & T) | { status: "error"; message: string };

export class OdooError extends Error {}
export class SessionExpiredError extends OdooError {}

/** Acepta "veolia.odoo.com", "https://veolia.odoo.com/web#..." etc. y devuelve el origen. */
export function normalizeOdooUrl(raw: string): string {
  const value = raw.trim();
  const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  return url.origin;
}

/** Llama a una ruta JSON (type='json') del módulo base_bim_2. */
async function call<T>(baseUrl: string, path: string, params: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", params }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new OdooError(`No se pudo conectar con ${baseUrl}`);
  }
  if (!response.ok) {
    throw new OdooError(
      response.status === 404
        ? "La URL no corresponde a un Odoo con el portal BIM instalado."
        : `Odoo respondió con un error (${response.status}).`,
    );
  }
  const data = await response.json().catch(() => null);
  if (!data) throw new OdooError("Respuesta no válida de Odoo.");
  if (data.error) throw new OdooError(data.error.data?.message || data.error.message || "Error de Odoo.");

  const result = data.result as PortalResult<T>;
  if (result.status === "error") {
    if (result.message === "session_expired") throw new SessionExpiredError("La sesión ha caducado.");
    throw new OdooError(result.message);
  }
  return result;
}

export function login(baseUrl: string, login: string, password: string) {
  return call<{ token: string; employee: Employee }>(baseUrl, "/bim/portal/login", { login, password });
}

export function getEmployee(baseUrl: string, token: string) {
  return call<{ employee: Employee }>(baseUrl, "/bim/portal/me", { token });
}

export function changePassword(baseUrl: string, token: string, oldPassword: string, newPassword: string) {
  return call<{ token: string }>(baseUrl, "/bim/portal/change-password", {
    token,
    old_password: oldPassword,
    new_password: newPassword,
  });
}
