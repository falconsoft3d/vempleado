"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { dashboardDetailAction } from "@/app/actions";
import BreakdownTable, {
  BY_DEPARTMENT,
  BY_EMPLOYEE,
  departmentGroups,
  employeeGroups,
  groupSheets,
} from "@/components/dashboard/BreakdownTable";
import EmployeeLines, { yesNo } from "@/components/dashboard/EmployeeLines";
import { formatHours, formatPercent } from "@/lib/dashboard";
import { formatDate } from "@/lib/imputation";
import type { DashboardEmployee, DashboardLine, DashboardProject, Named } from "@/lib/odoo";
import { downloadXlsx, type Cell } from "@/lib/xlsx";

type Props = {
  projects: DashboardProject[];
  total: number;
  from: string;
  to: string;
  employeeIds: number[];
  departmentId: number | null;
  jobId: number | null;
  employees: DashboardEmployee[];
  departments: Named[];
};

type View = "project" | "employee" | "department";
const VIEWS: { key: View; label: string }[] = [
  { key: "project", label: "Por obra" },
  { key: "employee", label: "Por empleado" },
  { key: "department", label: "Por departamento" },
];

const DETAIL_HEADER = [
  "Fecha",
  "Empleado",
  "Tipo hora",
  "Horas",
  "Sitio Veolia",
  "Plus Distancia",
  "HS Nocturna",
  "Notas",
  "Imputado por",
];
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

/**
 * Detalle por obra, empleado o departamento, exportable a Excel.
 * Al hacer clic en una obra se despliegan sus horas por empleado (y en cada empleado, sus líneas); en un empleado, sus obras; en un departamento, sus empleados.
 */
export default function ProjectTable(props: Props) {
  const { projects, total, from, to, employeeIds, departmentId, jobId, employees, departments } = props;
  const [view, setView] = useState<View>("project");
  const byEmployee = useMemo(
    () => employeeGroups(projects, employees, departments),
    [projects, employees, departments],
  );
  const byDepartment = useMemo(
    () => departmentGroups(byEmployee, employees, departments),
    [byEmployee, employees, departments],
  );
  const [openId, setOpenId] = useState<number | null>(null);
  const [lines, setLines] = useState<Record<number, DashboardLine[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const period = `${from}_${to}`;

  // Al cambiar el filtro (fechas, departamento, puesto o empleados) el detalle cargado ya no vale
  const scope = `${period}|${departmentId ?? ""}|${jobId ?? ""}|${employeeIds.join(",")}`;
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
      const result = await dashboardDetailAction(project.id, from, to, employeeIds, departmentId, jobId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLines((previous) => ({ ...previous, [project.id]: result.lines }));
    });
  }

  function exportView() {
    if (view === "employee")
      return downloadXlsx(`detalle-empleados_${period}`, groupSheets(BY_EMPLOYEE, byEmployee, total));
    if (view === "department") {
      return downloadXlsx(`detalle-departamentos_${period}`, groupSheets(BY_DEPARTMENT, byDepartment, total));
    }
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
        <h2>
          {view === "employee" ? BY_EMPLOYEE.title : view === "department" ? BY_DEPARTMENT.title : "Detalle por obra"}
        </h2>
        <div className="chart-actions">
          <div className="presets" role="group" aria-label="Agrupar el detalle">
            {VIEWS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={view === option.key ? "preset active" : "preset"}
                aria-pressed={view === option.key}
                onClick={() => setView(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-secondary" onClick={exportView}>
            Exportar a Excel
          </button>
        </div>
      </div>
      {view === "employee" ? (
        <>
          <p className="muted small">{BY_EMPLOYEE.hint}</p>
          <BreakdownTable grouping={BY_EMPLOYEE} groups={byEmployee} total={total} />
        </>
      ) : view === "department" ? (
        <>
          <p className="muted small">{BY_DEPARTMENT.hint}</p>
          <BreakdownTable grouping={BY_DEPARTMENT} groups={byDepartment} total={total} />
        </>
      ) : (
        <>
          <p className="muted small">
            Haz clic en una obra para ver sus horas por empleado, y en un empleado para ver sus líneas.
          </p>
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
                                    {projectLines.length} líneas ·{" "}
                                    {formatHours(projectLines.reduce((acc, line) => acc + line.hours, 0))} h
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => exportDetail(project)}
                                  >
                                    Exportar horas a Excel
                                  </button>
                                </div>
                                <EmployeeLines lines={projectLines} />
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
        </>
      )}
    </section>
  );
}
