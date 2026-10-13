import type { ExistingImputation, HourType, ImputationData, ImputationOptions, ImputationRow, Named } from "./odoo";

// Igual que PORTAL_MAX_DAYS en Odoo
export const MAX_DAYS = 62;
const DAY = 86_400_000;
export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Las fechas se manejan como "YYYY-MM-DD" en UTC para no depender de la zona horaria
export function parseISO(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function eachDay(from: string, to: string) {
  const days: string[] = [];
  for (let time = parseISO(from).getTime(); time <= parseISO(to).getTime(); time += DAY) days.push(toISO(new Date(time)));
  return days;
}

export function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

/** Lunes a domingo de la semana actual. */
export function currentWeek(now = new Date()): [string, string] {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = today - ((new Date(today).getUTCDay() + 6) % 7) * DAY;
  return [toISO(new Date(monday)), toISO(new Date(monday + 6 * DAY))];
}

// ------------------------------------------------------------------ Filtro (pantalla 1)

export type Filter = {
  target: string; // "me" o "g<id del subgrupo>"
  excluded: number[];
  projectIds: number[];
  favoriteId: number | null;
  dateFrom: string;
  dateTo: string;
};

export function selectedEmployees(options: ImputationOptions, filter: Filter): Named[] {
  if (filter.target === "me") return [options.me];
  const group = options.subgroups.find((subgroup) => `g${subgroup.id}` === filter.target);
  return group ? group.members.filter((member) => !filter.excluded.includes(member.id)) : [];
}

export function validateFilter(filter: Filter, employees: Named[]): string | null {
  if (!employees.length) return "Selecciona al menos un empleado.";
  if (!filter.projectIds.length) return "Selecciona al menos un proyecto.";
  if (!filter.dateFrom || !filter.dateTo) return "Indica el intervalo de fechas.";
  if (filter.dateFrom > filter.dateTo) return "La fecha «Desde» debe ser anterior a «Hasta».";
  if (eachDay(filter.dateFrom, filter.dateTo).length > MAX_DAYS) return `El intervalo no puede superar ${MAX_DAYS} días.`;
  return null;
}

// ------------------------------------------------------------------ Grilla (pantalla 2)

export type GridRow = {
  key: string;
  employeeId: number;
  date: string;
  weekday: number;
  holiday: string | null;
  nonWorking: boolean;
  projectId: number | null;
  hours: Record<number, string>;
};

export type Grid = {
  employees: Named[];
  projects: Named[];
  defaultProjectId: number | null;
  rows: GridRow[];
};

export function buildGrid(options: ImputationOptions, filter: Filter, employees: Named[], data: ImputationData): Grid {
  const typeIds = new Set(options.hour_types.map((type) => type.id));
  const holidays = new Map(data.holidays.map((holiday) => [holiday.date, holiday.name]));
  const existing = new Map<string, ExistingImputation[]>();
  for (const imputation of data.imputations) {
    const key = `${imputation.employee_id}|${imputation.date}`;
    existing.set(key, [...(existing.get(key) ?? []), imputation]);
  }

  // Proyectos elegidos + los que ya tenían imputados esos días
  const projects = options.projects.filter((project) => filter.projectIds.includes(project.id));
  for (const imputation of data.imputations) {
    if (imputation.project_id && !projects.some((project) => project.id === imputation.project_id)) {
      projects.push({ id: imputation.project_id, name: imputation.project_name ?? `#${imputation.project_id}` });
    }
  }

  const defaultProjectId = filter.favoriteId ?? (filter.projectIds.length === 1 ? filter.projectIds[0] : null);
  const rows: GridRow[] = [];
  for (const employee of employees) {
    for (const date of eachDay(filter.dateFrom, filter.dateTo)) {
      const key = `${employee.id}|${date}`;
      const weekday = parseISO(date).getUTCDay();
      const holiday = holidays.get(date) ?? null;
      const nonWorking = weekday === 0 || weekday === 6 || holiday !== null;
      const previous = existing.get(key);
      const hours: Record<number, string> = {};
      let projectId: number | null = null;

      if (previous) {
        projectId = previous[0].project_id;
        for (const imputation of previous) {
          if (!typeIds.has(imputation.extra_hour_id)) continue;
          hours[imputation.extra_hour_id] = String(Number(hours[imputation.extra_hour_id] ?? 0) + imputation.quantity);
        }
      } else if (!nonWorking) {
        projectId = defaultProjectId;
        for (const type of options.hour_types) if (type.default_qty > 0) hours[type.id] = String(type.default_qty);
      }
      rows.push({ key, employeeId: employee.id, date, weekday, holiday, nonWorking, projectId, hours });
    }
  }
  return { employees, projects, defaultProjectId, rows };
}

export function rowHasHours(row: GridRow) {
  return Object.values(row.hours).some((value) => Number(value) > 0);
}

export function toImputationRows(rows: GridRow[], hourTypes: HourType[]): ImputationRow[] {
  return rows.map((row) => ({
    employee_id: row.employeeId,
    date: row.date,
    project_id: row.projectId,
    hours: Object.fromEntries(
      hourTypes.map((type) => [type.id, Number(row.hours[type.id] || 0)]).filter(([, qty]) => qty > 0),
    ),
  }));
}
