import Link from "next/link";
import ConcentrationBars from "@/components/dashboard/ConcentrationBars";
import EffortSection from "@/components/dashboard/EffortSection";
import FilterSelect from "@/components/dashboard/FilterSelect";
import KpiRow from "@/components/dashboard/KpiRow";
import ProjectTable from "@/components/dashboard/ProjectTable";
import TopProjects from "@/components/dashboard/TopProjects";
import { formatHours, formatPercent, presets } from "@/lib/dashboard";
import { formatDate } from "@/lib/imputation";
import { getDashboard, OdooError, type DashboardData } from "@/lib/odoo";
import { requireEmployee } from "@/lib/session";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Params = { from?: string; to?: string; dept?: string; job?: string; emp?: string | string[] };
type Filters = { departmentId: number | null; jobId: number | null };

/** Query string del dashboard; sin departamento, puesto ni empleados = todos. */
function dashboardHref(from: string, to: string, filters: Filters, employeeIds: number[]) {
  const query = new URLSearchParams({ from, to });
  if (filters.departmentId) query.set("dept", String(filters.departmentId));
  if (filters.jobId) query.set("job", String(filters.jobId));
  for (const id of employeeIds) query.append("emp", String(id));
  return `/dashboard?${query}`;
}

/** Id positivo de un parámetro de la URL, o null. */
function idParam(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
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
    data = await getDashboard(
      session.url,
      session.token,
      from,
      to,
      requestedIds,
      idParam(params.dept),
      idParam(params.job),
    );
  } catch (e) {
    if (!(e instanceof OdooError)) throw e;
    error = e.message;
  }

  const departments = data?.departments ?? [];
  const departmentId = data?.department_id ?? null;
  const departmentName = departments.find((department) => department.id === departmentId)?.name;
  const jobs = data?.jobs ?? [];
  const jobId = data?.job_id ?? null;
  const jobName = jobs.find((job) => job.id === jobId)?.name;
  const filters = { departmentId, jobId };
  const employees = data?.employees ?? [];
  const selectedIds = data?.employee_ids ?? [];
  const selectedNames = employees.filter((employee) => selectedIds.includes(employee.id)).map((employee) => employee.name);
  const employeeScope = !selectedIds.length
    ? employees.length > 1
      ? "todos los empleados"
      : employees[0]?.name ?? ""
    : selectedNames.length <= 3
      ? selectedNames.join(", ")
      : `${selectedNames.length} empleados`;
  const scope = [departmentName, jobName, employeeScope].filter(Boolean).join(" · ");
  const projects = data?.projects ?? [];
  const total = data?.total_hours ?? 0;
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
          {(departments.length > 1 || departmentId) && (
            <FilterSelect label="Departamento" name="dept" options={departments} value={departmentId} resets={["job"]} />
          )}
          {(jobs.length > 1 || jobId) && <FilterSelect label="Puesto de trabajo" name="job" options={jobs} value={jobId} />}
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
                  <Link href={dashboardHref(from, to, filters, [])} className="small">
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
              href={dashboardHref(range.from, range.to, filters, selectedIds)}
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
          <KpiRow
            total={total}
            projectCount={projects.length}
            topShare={topShare}
            overtime50={data?.overtime_50 ?? 0}
            overtime100={data?.overtime_100 ?? 0}
            overtimeEmployees={data?.overtime_employees ?? []}
            plusDistanciaDays={data?.plus_distancia_days ?? 0}
            hsNocturnaDays={data?.hs_nocturna_days ?? 0}
            dayFlagEmployees={data?.day_flag_employees ?? []}
            period={`${from}_${to}`}
          />

          <EffortSection projects={projects} total={total} />

          <TopProjects projects={projects} total={total} />

          <section className="card chart-card">
            <h2>Concentración del esfuerzo por centro de costos</h2>
            <p className="muted small">Distribución de las {formatHours(total)} horas netas de ejecución en obras clave.</p>
            <ConcentrationBars projects={projects} total={total} />
          </section>

          <ProjectTable
            projects={projects}
            total={total}
            from={from}
            to={to}
            employeeIds={selectedIds}
            departmentId={departmentId}
            jobId={jobId}
            employees={employees}
            departments={departments}
          />
        </>
      )}
    </>
  );
}
