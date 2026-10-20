"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { loadImputationAction, saveImputationAction } from "@/app/actions";
import {
  buildGrid,
  formatDate,
  rowHasHours,
  toImputationRows,
  WEEKDAYS,
  type Filter,
  type Grid,
  type GridRow,
} from "@/lib/imputation";
import type { ImputationOptions, Named } from "@/lib/odoo";

// Columnas ocultas: ids de tipos de hora y claves de las columnas fijas (FLAGS y "note")
const HIDDEN_COLUMNS_KEY = "vempleado.hiddenHourTypes";

/** Marcas del día (booleanos en Odoo), después de los tipos de hora. */
const FLAGS = [
  { key: "plusDistancia", name: "Plus Distancia" },
  { key: "hsNocturna", name: "HS Nocturna" },
] as const;

type Props = { options: ImputationOptions; filter: Filter; grid: Grid; onBack: () => void };

export default function GridStep({ options, filter, grid, onBack }: Props) {
  const [rows, setRows] = useState(grid.rows);
  const [projects, setProjects] = useState(grid.projects);
  // Empleados cuya grilla ya se cargó; se guardan todos juntos
  const [loaded, setLoaded] = useState<Named[]>(grid.employees);
  const [view, setView] = useState(grid.employees.length > 1 ? "all" : String(grid.employees[0].id));
  const [loading, startLoading] = useTransition();
  const [hidden, setHidden] = useState<(number | string)[]>([]);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<{ error?: string; success?: string }>({});
  const [pending, startTransition] = useTransition();
  const columns = options.hour_types.filter((type) => !hidden.includes(type.id));
  const flags = FLAGS.filter((flag) => !hidden.includes(flag.key));
  const showNote = !hidden.includes("note");

  // El supervisor y los integrantes de los grupos que supervisa
  const allEmployees = useMemo(() => {
    const employees = new Map<number, Named>([[options.me.id, options.me]]);
    for (const subgroup of options.subgroups) for (const member of subgroup.members) employees.set(member.id, member);
    return [...employees.values()];
  }, [options]);
  const visibleEmployees = view === "all" ? loaded : loaded.filter((employee) => String(employee.id) === view);
  const visibleIds = new Set(visibleEmployees.map((employee) => employee.id));
  const visibleRows = rows.filter((row) => visibleIds.has(row.employeeId));
  const commonProject = visibleRows.every((row) => row.projectId === visibleRows[0]?.projectId)
    ? visibleRows[0]?.projectId ?? null
    : null;
  const commonSite = visibleRows.every((row) => row.siteId === visibleRows[0]?.siteId)
    ? visibleRows[0]?.siteId ?? null
    : null;
  const siteRequired = (projectId: number | null) =>
    projects.some((project) => project.id === projectId && project.site_required);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HIDDEN_COLUMNS_KEY) ?? "[]");
      if (Array.isArray(saved)) setHidden(saved);
    } catch {}
  }, []);

  function toggleColumn(id: number | string) {
    setHidden((previous) => {
      const next = previous.includes(id) ? previous.filter((column) => column !== id) : [...previous, id];
      try {
        localStorage.setItem(HIDDEN_COLUMNS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function update(key: string, change: (row: GridRow) => GridRow) {
    setRows((previous) => previous.map((row) => (row.key === key ? change(row) : row)));
    setStatus({});
  }

  /** El proyecto elegido en la cabecera se aplica a todas las líneas visibles. */
  function setProjectForAll(projectId: number | null) {
    setRows((previous) => previous.map((row) => (visibleIds.has(row.employeeId) ? { ...row, projectId } : row)));
    setInvalid(new Set());
    setStatus({});
  }

  /** El sitio elegido en la cabecera se aplica a las líneas visibles cuyo proyecto lo pide. */
  function setSiteForAll(siteId: number | null) {
    setRows((previous) =>
      previous.map((row) => (visibleIds.has(row.employeeId) && siteRequired(row.projectId) ? { ...row, siteId } : row)),
    );
    setInvalid(new Set());
    setStatus({});
  }

  /** Cambia el empleado de la grilla; si aún no se cargó, trae sus horas del intervalo. */
  function changeEmployee(value: string) {
    setStatus({});
    if (value === "all" || loaded.some((employee) => String(employee.id) === value)) {
      setView(value);
      return;
    }
    const employee = allEmployees.find((candidate) => String(candidate.id) === value);
    if (!employee) return;
    startLoading(async () => {
      const result = await loadImputationAction([employee.id], filter.dateFrom, filter.dateTo);
      if (!result.ok) {
        setStatus({ error: result.error });
        return;
      }
      const extra = buildGrid(options, filter, [employee], result);
      setRows((previous) => [...previous, ...extra.rows]);
      setProjects((previous) => [...previous, ...extra.projects.filter((p) => !previous.some((q) => q.id === p.id))]);
      setLoaded((previous) => [...previous, employee]);
      setView(value);
    });
  }

  function setHours(key: string, typeId: number, value: string) {
    update(key, (row) => ({
      ...row,
      // Al cargar horas en un día sin proyecto (ej. sábado) se propone el preferido
      projectId: row.projectId ?? (Number(value) > 0 ? grid.defaultProjectId : null),
      hours: { ...row.hours, [typeId]: value },
    }));
  }

  function save() {
    const missing = rows.filter((row) => rowHasHours(row) && !row.projectId);
    const missingSite = rows.filter((row) => rowHasHours(row) && siteRequired(row.projectId) && !row.siteId);
    // Las marcas y notas se graban en las líneas de horas: sin horas no hay dónde guardarlas
    const unflaggable = rows.filter(
      (row) => (row.plusDistancia || row.hsNocturna || row.note.trim()) && !rowHasHours(row),
    );
    const wrong = missing.length ? missing : missingSite.length ? missingSite : unflaggable;
    setInvalid(new Set(wrong.map((row) => row.key)));
    if (wrong.length) {
      if (!wrong.some((row) => visibleIds.has(row.employeeId))) setView(String(wrong[0].employeeId));
      setStatus({
        error: missing.length
          ? `Selecciona el proyecto en ${missing.length} día(s) con horas cargadas.`
          : missingSite.length
          ? `Selecciona el sitio Veolia en ${missingSite.length} día(s).`
          : `Carga horas en ${unflaggable.length} día(s) con Plus Distancia, HS Nocturna o notas.`,
      });
      return;
    }
    startTransition(async () => {
      const result = await saveImputationAction(toImputationRows(rows, options.hour_types));
      setStatus(
        result.ok
          ? { success: `Imputación guardada: ${result.count} registro(s).` }
          : { error: result.error },
      );
    });
  }

  function total(employeeRows: GridRow[], typeId: number) {
    const sum = employeeRows.reduce((acc, row) => acc + (Number(row.hours[typeId]) || 0), 0);
    return Number.isInteger(sum) ? String(sum) : sum.toFixed(2);
  }

  return (
    <section className="card">
      <div className="grid-toolbar">
        <button type="button" className="btn btn-secondary" onClick={onBack} disabled={pending}>
          ← Volver
        </button>
        <details className="column-picker">
          <summary className="btn btn-secondary">Columnas visibles</summary>
          <div className="column-menu">
            {options.hour_types.map((type) => (
              <label key={type.id}>
                <input type="checkbox" checked={!hidden.includes(type.id)} onChange={() => toggleColumn(type.id)} />
                {type.name}
              </label>
            ))}
            {FLAGS.map((flag) => (
              <label key={flag.key}>
                <input type="checkbox" checked={!hidden.includes(flag.key)} onChange={() => toggleColumn(flag.key)} />
                {flag.name}
              </label>
            ))}
            <label>
              <input type="checkbox" checked={showNote} onChange={() => toggleColumn("note")} />
              Notas
            </label>
          </div>
        </details>
        {allEmployees.length > 1 && (
          <label className="employee-picker">
            Empleado
            <select value={view} onChange={(event) => changeEmployee(event.target.value)} disabled={loading || pending}>
              {loaded.length > 1 && <option value="all">Todos los cargados ({loaded.length})</option>}
              {allEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                  {employee.id === options.me.id ? " (yo)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="btn btn-primary" onClick={save} disabled={pending || loading}>
          {pending ? "Guardando…" : "Guardar imputación"}
        </button>
      </div>
      {loaded.length > 1 && (
        <p className="muted small">
          Al guardar se graban las horas de todos los empleados cargados ({loaded.map((e) => e.name).join(", ")}).
        </p>
      )}
      {!options.hour_types.some((type) => type.default_qty > 0) && (
        <p className="alert alert-info">
          Ningún tipo de hora tiene «Horas por defecto en portal» configuradas en Odoo, por eso no se precargan horas
          (BIM → Datos → Costes → Horas extras).
        </p>
      )}
      {status.error && <p className="alert alert-error">{status.error}</p>}
      {status.success && <p className="alert alert-success">{status.success}</p>}

      <div className="table-wrap">
        <table className="grid-table">
          <thead>
            <tr>
              <th>Día</th>
              <th>Fecha</th>
              <th>
                <select
                  className="header-select"
                  value={commonProject ?? ""}
                  aria-label="Proyecto para todas las líneas"
                  title="Aplicar a todas las líneas"
                  onChange={(event) => setProjectForAll(event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">Proyecto (todas las líneas)</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {siteRequired(commonProject) && (
                  <select
                    className="header-select site-select"
                    value={commonSite ?? ""}
                    aria-label="Sitio Veolia para todas las líneas"
                    title="Aplicar a todas las líneas"
                    onChange={(event) => setSiteForAll(event.target.value ? Number(event.target.value) : null)}
                  >
                    <option value="">Sitio (todas las líneas)</option>
                    {options.sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                )}
              </th>
              {columns.map((type) => (
                <th key={type.id} className="num">
                  {type.name}
                </th>
              ))}
              {flags.map((flag) => (
                <th key={flag.key} className="num">
                  {flag.name}
                </th>
              ))}
              {showNote && <th>Notas</th>}
            </tr>
          </thead>
          {visibleEmployees.map((employee) => {
            const employeeRows = rows.filter((row) => row.employeeId === employee.id);
            return (
              <tbody key={employee.id}>
                {visibleEmployees.length > 1 && (
                  <tr className="group-row">
                    <th colSpan={3 + columns.length + flags.length + (showNote ? 1 : 0)}>{employee.name}</th>
                  </tr>
                )}
                {employeeRows.map((row) => (
                  <tr
                    key={row.key}
                    className={[row.nonWorking && "row-off", invalid.has(row.key) && "row-invalid"].filter(Boolean).join(" ")}
                  >
                    <td>
                      {WEEKDAYS[row.weekday]}
                      {row.holiday && <span className="holiday">{row.holiday}</span>}
                    </td>
                    <td>{formatDate(row.date)}</td>
                    <td>
                      <select
                        value={row.projectId ?? ""}
                        aria-label={`Proyecto del ${formatDate(row.date)}`}
                        onChange={(event) =>
                          update(row.key, (current) => ({
                            ...current,
                            projectId: event.target.value ? Number(event.target.value) : null,
                          }))
                        }
                      >
                        <option value="">—</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                      {siteRequired(row.projectId) && (
                        <select
                          className="site-select"
                          value={row.siteId ?? ""}
                          aria-label={`Sitio Veolia del ${formatDate(row.date)}`}
                          onChange={(event) =>
                            update(row.key, (current) => ({
                              ...current,
                              siteId: event.target.value ? Number(event.target.value) : null,
                            }))
                          }
                        >
                          <option value="">Sitio Veolia…</option>
                          {options.sites.map((site) => (
                            <option key={site.id} value={site.id}>
                              {site.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    {columns.map((type) => (
                      <td key={type.id} className={Number(row.hours[type.id]) > 0 ? "num filled" : "num"}>
                        {type.input === "check" ? (
                          <input
                            type="checkbox"
                            aria-label={`${type.name} ${formatDate(row.date)}`}
                            checked={Number(row.hours[type.id] || 0) > 0}
                            onChange={(event) => setHours(row.key, type.id, event.target.checked ? "1" : "")}
                          />
                        ) : (
                          <input
                            type="number"
                            min={0}
                            max={24}
                            step={0.5}
                            inputMode="decimal"
                            placeholder="0"
                            aria-label={`${type.name} ${formatDate(row.date)}`}
                            value={row.hours[type.id] ?? ""}
                            onChange={(event) => setHours(row.key, type.id, event.target.value)}
                          />
                        )}
                      </td>
                    ))}
                    {flags.map((flag) => (
                      <td key={flag.key} className={row[flag.key] ? "num filled" : "num"}>
                        <input
                          type="checkbox"
                          aria-label={`${flag.name} ${formatDate(row.date)}`}
                          checked={row[flag.key]}
                          onChange={(event) => update(row.key, (current) => ({ ...current, [flag.key]: event.target.checked }))}
                        />
                      </td>
                    ))}
                    {showNote && (
                      <td>
                        <input
                          type="text"
                          className="note-input"
                          maxLength={250}
                          aria-label={`Notas ${formatDate(row.date)}`}
                          value={row.note}
                          onChange={(event) => update(row.key, (current) => ({ ...current, note: event.target.value }))}
                        />
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={3}>Total{visibleEmployees.length > 1 ? ` · ${employee.name}` : ""}</td>
                  {columns.map((type) => (
                    <td key={type.id} className="num">
                      {total(employeeRows, type.id)}
                    </td>
                  ))}
                  {flags.map((flag) => (
                    <td key={flag.key} className="num">
                      {employeeRows.filter((row) => row[flag.key]).length}
                    </td>
                  ))}
                  {showNote && <td />}
                </tr>
              </tbody>
            );
          })}
        </table>
      </div>
    </section>
  );
}
