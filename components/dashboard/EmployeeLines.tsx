"use client";

import { Fragment, useMemo, useState } from "react";
import { formatHours, formatPercent } from "@/lib/dashboard";
import { formatDate } from "@/lib/imputation";
import type { DashboardLine } from "@/lib/odoo";

export const yesNo = (value: boolean) => (value ? "Sí" : "");

const LINE_HEADER = [
  "Fecha",
  "Tipo hora",
  "Horas",
  "Sitio Veolia",
  "Plus Distancia",
  "HS Nocturna",
  "Notas",
  "Imputado por",
];

/** Líneas de una obra agrupadas por empleado (de más a menos horas); al abrir un empleado se ven sus líneas. */
export default function EmployeeLines({ lines }: { lines: DashboardLine[] }) {
  const [openName, setOpenName] = useState<string | null>(null);
  const toggle = (name: string) => setOpenName((current) => (current === name ? null : name));

  const groups = useMemo(() => {
    const byEmployee = new Map<string, { name: string; hours: number; lines: DashboardLine[] }>();
    for (const line of lines) {
      const group = byEmployee.get(line.employee) ?? { name: line.employee, hours: 0, lines: [] };
      group.hours += line.hours;
      group.lines.push(line);
      byEmployee.set(line.employee, group);
    }
    return [...byEmployee.values()].sort((a, b) => b.hours - a.hours);
  }, [lines]);
  const total = groups.reduce((acc, group) => acc + group.hours, 0);

  return (
    <div className="table-wrap employee-lines">
      <table className="grid-table data-table">
        <thead>
          <tr>
            <th>Empleado</th>
            <th className="num">Líneas</th>
            <th className="num">Horas</th>
            <th className="num">% de la obra</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const open = openName === group.name;
            return (
              <Fragment key={group.name}>
                <tr
                  className={open ? "project-row open" : "project-row"}
                  tabIndex={0}
                  aria-expanded={open}
                  onClick={() => toggle(group.name)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggle(group.name);
                    }
                  }}
                >
                  <td>
                    <span className="caret" aria-hidden="true">
                      {open ? "▾" : "▸"}
                    </span>
                    {group.name}
                  </td>
                  <td className="num">{group.lines.length}</td>
                  <td className="num">{formatHours(group.hours)}</td>
                  <td className="num">{formatPercent(group.hours / (total || 1))}</td>
                </tr>
                {open && (
                  <tr className="detail-row">
                    <td colSpan={4}>
                      <div className="table-wrap detail-wrap">
                        <table className="grid-table data-table">
                          <thead>
                            <tr>
                              {LINE_HEADER.map((title) => (
                                <th key={title} className={title === "Horas" ? "num" : undefined}>
                                  {title}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {group.lines.map((line) => (
                              <tr key={line.id}>
                                <td>{formatDate(line.date)}</td>
                                <td>{line.hour_type}</td>
                                <td className="num">{formatHours(line.hours)}</td>
                                <td>{line.site ?? "—"}</td>
                                <td>{yesNo(line.plus_distancia) || "—"}</td>
                                <td>{yesNo(line.hs_nocturna) || "—"}</td>
                                <td className="note-cell">{line.note ?? "—"}</td>
                                <td>{line.imputed_by ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
