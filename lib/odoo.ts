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

// ------------------------------------------------------- Imputación de horas

export type HourType = { id: number; name: string; input: "hours" | "check"; default_qty: number };
export type Named = { id: number; name: string };
/** site_required: al imputar en el proyecto se elige el sitio Veolia. */
export type Project = Named & { site_required: boolean };
export type ImputationOptions = {
  me: Named;
  subgroups: (Named & { members: Named[] })[];
  projects: Project[];
  sites: Named[];
  hour_types: HourType[];
};
export type ExistingImputation = {
  employee_id: number;
  date: string;
  project_id: number | null;
  project_name: string | null;
  project_site_required: boolean;
  site_id: number | null;
  extra_hour_id: number;
  quantity: number;
  plus_distancia: boolean;
  hs_nocturna: boolean;
  note: string;
};
export type ImputationData = { holidays: { date: string; name: string }[]; imputations: ExistingImputation[] };
export type ImputationRow = {
  employee_id: number;
  date: string;
  project_id: number | null;
  site_id: number | null;
  hours: Record<number, number>;
  plus_distancia: boolean;
  hs_nocturna: boolean;
  note: string;
};

export function getImputationOptions(baseUrl: string, token: string) {
  return call<ImputationOptions>(baseUrl, "/bim/portal/imputation/options", { token });
}

export function loadImputations(baseUrl: string, token: string, employeeIds: number[], dateFrom: string, dateTo: string) {
  return call<ImputationData>(baseUrl, "/bim/portal/imputation/load", {
    token,
    employee_ids: employeeIds,
    date_from: dateFrom,
    date_to: dateTo,
  });
}

export function saveImputations(baseUrl: string, token: string, rows: ImputationRow[]) {
  return call<{ count: number }>(baseUrl, "/bim/portal/imputation/save", { token, rows });
}

// ------------------------------------------------------- Dashboard

export type DashboardProject = {
  id: number;
  code: string;
  name: string;
  cost_center: string | null;
  client: string | null;
  hours: number;
  /** Horas de cada empleado en la obra, de mayor a menor. */
  employees: (Named & { hours: number })[];
};
export type DashboardData = {
  date_from: string;
  date_to: string;
  total_hours: number;
  projects: DashboardProject[];
  employees: Named[];
  employee_ids: number[];
  // Opcionales: Odoo los envía desde la versión con el KPI de horas extra
  overtime_50?: number;
  overtime_100?: number;
  overtime_employees?: OvertimeEmployee[];
};
/** Horas al 50% y al 100% de un empleado en el intervalo. */
export type OvertimeEmployee = Named & { hours_50: number; hours_100: number };

/** Una línea de horas cargada en una obra (detalle del dashboard). */
export type DashboardLine = {
  id: number;
  date: string;
  employee: string;
  hour_type: string;
  hours: number;
  site: string | null;
  plus_distancia: boolean;
  hs_nocturna: boolean;
  note: string | null;
  imputed_by: string | null;
};

export function getDashboardDetail(
  baseUrl: string,
  token: string,
  projectId: number,
  dateFrom: string,
  dateTo: string,
  employeeIds: number[],
) {
  return call<{ lines: DashboardLine[] }>(baseUrl, "/bim/portal/dashboard/detail", {
    token,
    project_id: projectId,
    date_from: dateFrom,
    date_to: dateTo,
    employee_ids: employeeIds,
  });
}

export function getDashboard(baseUrl: string, token: string, dateFrom: string, dateTo: string, employeeIds: number[]) {
  return call<DashboardData>(baseUrl, "/bim/portal/dashboard", {
    token,
    date_from: dateFrom,
    date_to: dateTo,
    employee_ids: employeeIds,
  });
}
