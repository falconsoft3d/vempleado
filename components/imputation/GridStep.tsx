"use client";

import { useEffect, useState, useTransition } from "react";
import { saveImputationAction } from "@/app/actions";
import { formatDate, rowHasHours, toImputationRows, WEEKDAYS, type Grid, type GridRow } from "@/lib/imputation";
import type { ImputationOptions } from "@/lib/odoo";

const HIDDEN_COLUMNS_KEY = "vempleado.hiddenHourTypes";

type Props = { options: ImputationOptions; grid: Grid; onBack: () => void };

export default function GridStep({ options, grid, onBack }: Props) {
  const [rows, setRows] = useState(grid.rows);
  const [hidden, setHidden] = useState<number[]>([]);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<{ error?: string; success?: string }>({});
  const [pending, startTransition] = useTransition();
  const columns = options.hour_types.filter((type) => !hidden.includes(type.id));
  const commonProject = rows.every((row) => row.projectId === rows[0]?.projectId) ? rows[0]?.projectId ?? null : null;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HIDDEN_COLUMNS_KEY) ?? "[]");
      if (Array.isArray(saved)) setHidden(saved);
    } catch {}
  }, []);

  function toggleColumn(id: number) {
    setHidden((previous) => {
      const next = previous.includes(id) ? previous.filter((typeId) => typeId !== id) : [...previous, id];
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

  /** El proyecto elegido en la cabecera se aplica a todas las líneas. */
  function setProjectForAll(projectId: number | null) {
    setRows((previous) => previous.map((row) => ({ ...row, projectId })));
    setInvalid(new Set());
    setStatus({});
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
    setInvalid(new Set(missing.map((row) => row.key)));
    if (missing.length) {
      setStatus({ error: `Selecciona el proyecto en ${missing.length} día(s) con horas cargadas.` });
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
          </div>
        </details>
        <button type="button" className="btn btn-primary" onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Guardar imputación"}
        </button>
      </div>
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
                  {grid.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </th>
              {columns.map((type) => (
                <th key={type.id} className="num">
                  {type.name}
                </th>
              ))}
            </tr>
          </thead>
          {grid.employees.map((employee) => {
            const employeeRows = rows.filter((row) => row.employeeId === employee.id);
            return (
              <tbody key={employee.id}>
                {grid.employees.length > 1 && (
                  <tr className="group-row">
                    <th colSpan={3 + columns.length}>{employee.name}</th>
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
                        {grid.projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    {columns.map((type) => (
                      <td key={type.id} className="num">
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
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={3}>Total{grid.employees.length > 1 ? ` · ${employee.name}` : ""}</td>
                  {columns.map((type) => (
                    <td key={type.id} className="num">
                      {total(employeeRows, type.id)}
                    </td>
                  ))}
                </tr>
              </tbody>
            );
          })}
        </table>
      </div>
    </section>
  );
}
