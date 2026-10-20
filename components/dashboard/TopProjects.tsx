import { formatHours, formatPercent, projectLabel } from "@/lib/dashboard";
import type { DashboardProject } from "@/lib/odoo";

const TOP = 5;

/** Ranking de las obras con más horas; la barra es relativa a la primera. */
export default function TopProjects({ projects, total }: { projects: DashboardProject[]; total: number }) {
  const top = projects.slice(0, TOP);
  const max = top[0]?.hours || 1;
  return (
    <section className="card chart-card">
      <h2>Top {top.length} obras con más horas</h2>
      <ol className="top-list">
        {top.map((project, index) => (
          <li key={project.id}>
            <span className="top-rank">{index + 1}</span>
            <div className="top-body">
              <div className="top-title">
                <strong>{projectLabel(project)}</strong>
                {project.client && <span className="muted small">{project.client}</span>}
              </div>
              <div className="bar-track">
                <div className="bar" style={{ width: `${Math.max(1, (project.hours / max) * 100)}%` }} />
                <span className="bar-value">
                  {formatHours(project.hours)} h ({formatPercent(project.hours / total)})
                </span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
