import Link from "next/link";
import ConcentrationBars from "@/components/dashboard/ConcentrationBars";
import Treemap from "@/components/dashboard/Treemap";
import { formatHours, formatPercent, presets, projectCode } from "@/lib/dashboard";
import { formatDate } from "@/lib/imputation";
import { getDashboard, OdooError, type DashboardData } from "@/lib/odoo";
import { requireEmployee } from "@/lib/session";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TREEMAP_LABELED = 5;

type Params = { from?: string; to?: string; emp?: string | string[] };

/** Query string del dashboard; sin empleados = todos. */
function dashboardHref(from: string, to: string, employeeIds: number[]) {
  const query = new URLSearchParams({ from, to });
  for (const id of employeeIds) query.append("emp", String(id));
  return `/dashboard?${query}`;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { session } = await requireEmployee();
  const params = await searchParams;
  const ranges = presets();
  const yearRange = ranges[ranges.length - 1];
  const from = params.from && ISO_DATE.test(params.from) ? params.from : yearRange.from;
  const to = params.to && ISO_DATE.test(params.to) ? params.to : yearRange.to;
  const requestedIds = [params.emp ?? []].flat().map(Number).filter((id) => Number.isInteger(id) && id > 0);

  let data: DashboardData | null = null;
  let error: string | null = null;
  try {
    data = await getDashboard(session.url, session.token, from, to, requestedIds);
  } catch (e) {
    if (!(e instanceof OdooError)) throw e;
    error = e.message;
  }

  const employees = data?.employees ?? [];
  const selectedIds = data?.employee_ids ?? [];
  const selectedNames = employees.filter((employee) => selectedIds.includes(employee.id)).map((employee) => employee.name);
  const scope = !selectedIds.length
    ? employees.length > 1
      ? "todos los empleados"
      : employees[0]?.name ?? ""
    : selectedNames.length <= 3
      ? selectedNames.join(", ")
      : `${selectedNames.length} empleados`;
  const projects = data?.projects ?? [];
  const total = data?.total_hours ?? 0;
  const leader = projects[0];
  const minor = projects.slice(TREEMAP_LABELED);
  const minorShare = minor.reduce((acc, project) => acc + project.hours, 0) / (total || 1);
  const topShare = projects.slice(0, 3).reduce((acc, project) => acc + project.hours, 0) / (total || 1);

  return (
    <>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">
          Horas imputadas a obras · {scope} · {formatDate(from)} – {formatDate(to)}
        </p>
      </header>

      <div className="filter-row">
        <form className="range-form" method="get">
          <label>
            Desde
            <input type="date" name="from" defaultValue={from} required />
          </label>
          <label>
            Hasta
            <input type="date" name="to" defaultValue={to} required />
          </label>
          {employees.length > 1 && (
            <details className="employee-filter">
              <summary>
                <span className="filter-caption">Empleados</span>
                <span className="filter-value">
                  {selectedIds.length ? `${selectedIds.length} de ${employees.length}` : "Todos"}
                </span>
              </summary>
              <div className="employee-menu">
                <p className="muted small">Marca uno o varios. Sin marcar = todos.</p>
                {employees.map((employee) => (
                  <label key={employee.id}>
                    <input type="checkbox" name="emp" value={employee.id} defaultChecked={selectedIds.includes(employee.id)} />
                    {employee.name}
                  </label>
                ))}
                {selectedIds.length > 0 && (
                  <Link href={dashboardHref(from, to, [])} className="small">
                    Ver todos los empleados
                  </Link>
                )}
              </div>
            </details>
          )}
          <button type="submit" className="btn btn-secondary">
            Aplicar
          </button>
        </form>
        <nav className="presets" aria-label="Intervalos rápidos">
          {ranges.map((range) => (
            <Link
              key={range.label}
              href={dashboardHref(range.from, range.to, selectedIds)}
              className={range.from === from && range.to === to ? "preset active" : "preset"}
            >
              {range.label}
            </Link>
          ))}
        </nav>
      </div>

      {error ? (
        <p className="alert alert-error">{error}</p>
      ) : !projects.length ? (
        <p className="alert alert-info">No hay horas imputadas a obras en este intervalo.</p>
      ) : (
        <>
          <div className="kpis">
            <div className="card kpi kpi-hero">
              <span className="kpi-label">Horas imputadas a obras</span>
              <span className="kpi-value">{formatHours(total)} h</span>
            </div>
            <div className="card kpi">
              <span className="kpi-label">Obras con horas</span>
              <span className="kpi-value">{projects.length}</span>
            </div>
            <div className="card kpi">
              <span className="kpi-label">Concentración en las 3 principales</span>
              <span className="kpi-value">{formatPercent(topShare)}</span>
            </div>
          </div>

          <section className="card chart-card">
            <h2>Distribución del esfuerzo en obras ({formatHours(total)} h)</h2>
            <p className="muted small">Cada bloque es una obra; su tamaño y su tono son proporcionales a las horas.</p>
            <div className="chart-with-notes">
              <Treemap projects={projects} total={total} />
              <div className="notes">
                <aside className="callout">
                  <p>
                    La obra {projectCode(leader)} consumió el <strong>{formatPercent(leader.hours / total)}</strong> del total
                    de las horas asignadas a obras.
                  </p>
                </aside>
                {minor.length > 1 && (
                  <aside className="callout">
                    <p>
                      {minor.length} obras distintas se reparten apenas el <strong>{formatPercent(minorShare)}</strong>{" "}
                      del tiempo restante.
                    </p>
                  </aside>
                )}
              </div>
            </div>
          </section>

          <section className="card chart-card">
            <h2>Concentración del esfuerzo por centro de costos</h2>
            <p className="muted small">Distribución de las {formatHours(total)} horas netas de ejecución en obras clave.</p>
            <ConcentrationBars projects={projects} total={total} />
          </section>

          <section className="card chart-card">
            <h2>Detalle por obra</h2>
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
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        [{project.code}] {project.name}
                      </td>
                      <td>{project.client ?? "—"}</td>
                      <td>{project.cost_center ?? "—"}</td>
                      <td className="num">{formatHours(project.hours)}</td>
                      <td className="num">{formatPercent(project.hours / total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
