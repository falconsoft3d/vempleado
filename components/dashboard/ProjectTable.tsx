"use client";

import { Fragment, useState, useTransition } from "react";
import { dashboardDetailAction } from "@/app/actions";
import { formatHours, formatPercent } from "@/lib/dashboard";
import { formatDate } from "@/lib/imputation";
import type { DashboardLine, DashboardProject } from "@/lib/odoo";
import { downloadXlsx, type Cell } from "@/lib/xlsx";

type Props = { projects: DashboardProject[]; total: number; from: string; to: string; employeeIds: number[] };

const yesNo = (value: boolean) => (value ? "Sí" : "");

const DETAIL_HEADER = ["Fecha", "Empleado", "Tipo hora", "Horas", "Sitio Veolia", "Plus Distancia", "HS Nocturna", "Notas", "Imputado por"];
const detailRow = (line: DashboardLine): Cell[] => [
  formatDate(line.date),
  line.employee,
  line.hour_type,
  line.hours,
  line.site,
  yesNo(line.plus_distancia),
  yesNo(line.hs_nocturna),
  line.note,
  line.imputed_by,
];

/** Detalle por obra: exportable a Excel; al hacer clic en una obra se despliegan sus líneas de horas. */
export default function ProjectTable({ projects, total, from, to, employeeIds }: Props) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [lines, setLines] = useState<Record<number, DashboardLine[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const period = `${from}_${to}`;

  // Al cambiar el filtro (fechas o empleados) el detalle cargado ya no vale
  const scope = `${period}|${employeeIds.join(",")}`;
  const [loadedScope, setLoadedScope] = useState(scope);
  if (loadedScope !== scope) {
    setLoadedScope(scope);
    setLines({});
    setOpenId(null);
  }

  function toggle(project: DashboardProject) {
    setError(null);
    if (openId === project.id) {
      setOpenId(null);
      return;
    }
    setOpenId(project.id);
    if (lines[project.id]) return;
    startLoading(async () => {
      const result = await dashboardDetailAction(project.id, from, to, employeeIds);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLines((previous) => ({ ...previous, [project.id]: result.lines }));
    });
  }

  function exportProjects() {
    downloadXlsx(`detalle-obras_${period}`, [
      {
        name: "Detalle por obra",
        widths: [12, 40, 30, 20, 10, 8],
        rows: [
          ["Código", "Obra", "Cliente", "Centro de costos", "Horas", "%"],
          ...projects.map((project) => [
            project.code,
            project.name,
            project.client,
            project.cost_center,
            project.hours,
            Math.round((project.hours / total) * 1000) / 10,
          ]),
          ["", "Total", "", "", total, 100],
        ],
      },
    ]);
  }

  function exportDetail(project: DashboardProject) {
    const projectLines = lines[project.id] ?? [];
    downloadXlsx(`horas_${project.code}_${period}`, [
      {
        name: `${project.code} ${project.name}`,
        widths: [12, 28, 14, 8, 28, 14, 12, 40, 24],
        rows: [DETAIL_HEADER, ...projectLines.map(detailRow)],
      },
    ]);
  }

  return (
    <section className="card chart-card">
      <div className="chart-head">
        <h2>Detalle por obra</h2>
        <button type="button" className="btn btn-secondary" onClick={exportProjects}>
          Exportar a Excel
        </button>
      </div>
      <p className="muted small">Haz clic en una obra para ver todas las horas cargadas.</p>
      {error && <p className="alert alert-error">{error}</p>}
      <div className="table-wrap">
        <table className="grid-table data-table">
          <thead>
            <tr>
              <th>Obra</th>
              <th>Cliente</th>
              <th>Centro de costos</th>
              <th className="num">Horas</th>
              <th className="num">%</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const open = openId === project.id;
              const projectLines = lines[project.id];
              return (
                <Fragment key={project.id}>
                  <tr
                    className={open ? "project-row open" : "project-row"}
                    tabIndex={0}
                    aria-expanded={open}
                    onClick={() => toggle(project)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggle(project);
                      }
                    }}
                  >
                    <td>
                      <span className="caret" aria-hidden="true">
                        {open ? "▾" : "▸"}
                      </span>
                      [{project.code}] {project.name}
                    </td>
                    <td>{project.client ?? "—"}</td>
                    <td>{project.cost_center ?? "—"}</td>
                    <td className="num">{formatHours(project.hours)}</td>
                    <td className="num">{formatPercent(project.hours / total)}</td>
                  </tr>
                  {open && (
                    <tr className="detail-row">
                      <td colSpan={5}>
                        {!projectLines ? (
                          <p className="muted small">{loading ? "Cargando horas…" : ""}</p>
                        ) : !projectLines.length ? (
                          <p className="muted small">No hay líneas de horas para esta obra.</p>
                        ) : (
                          <>
                            <div className="detail-head">
                              <span className="muted small">
                                {projectLines.length} líneas · {formatHours(projectLines.reduce((acc, line) => acc + line.hours, 0))} h
                              </span>
                              <button type="button" className="btn btn-secondary" onClick={() => exportDetail(project)}>
                                Exportar horas a Excel
                              </button>
                            </div>
                            <div className="table-wrap detail-wrap">
                              <table className="grid-table data-table">
                                <thead>
                                  <tr>
                                    {DETAIL_HEADER.map((title) => (
                                      <th key={title} className={title === "Horas" ? "num" : undefined}>
                                        {title}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {projectLines.map((line) => (
                                    <tr key={line.id}>
                                      <td>{formatDate(line.date)}</td>
                                      <td>{line.employee}</td>
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
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
