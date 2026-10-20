import { formatHours, formatPercent, projectCode, projectLabel } from "@/lib/dashboard";
import type { DashboardProject } from "@/lib/odoo";

const TOP = 3;

export default function ConcentrationBars({ projects, total }: { projects: DashboardProject[]; total: number }) {
  const top = projects.slice(0, TOP);
  const rest = projects.slice(TOP);
  const restHours = rest.reduce((acc, project) => acc + project.hours, 0);
  const bars = [
    ...top.map((project) => ({
      key: String(project.id),
      title: project.name,
      subtitle: `[${projectCode(project)}]`,
      hours: project.hours,
      emphasis: true,
    })),
    ...(rest.length
      ? [{ key: "rest", title: "Resto de obras", subtitle: `(${rest.length} obras menores)`, hours: restHours, emphasis: false }]
      : []),
  ];
  const max = Math.max(...bars.map((bar) => bar.hours));
  const topShare = top.reduce((acc, project) => acc + project.hours, 0) / total;
  const leaderShare = top[0].hours / total;

  return (
    <div className="concentration">
      <div className="bars">
        {bars.map((bar) => (
          <div key={bar.key} className="bar-row" title={`${bar.title} ${bar.subtitle}: ${formatHours(bar.hours)} hs`}>
            <div className="bar-label">
              {bar.title}
              <span>{bar.subtitle}</span>
            </div>
            <div className="bar-track">
              <div
                className={bar.emphasis ? "bar" : "bar bar-rest"}
                style={{ width: `${Math.max(1, (bar.hours / max) * 100)}%` }}
              />
              <span className="bar-value">
                {formatHours(bar.hours)} hs ({formatPercent(bar.hours / total)})
              </span>
            </div>
          </div>
        ))}
      </div>
      {rest.length > 0 && (
        <aside className="callout">
          <p>
            <strong>
              El {formatPercent(topShare)} de las horas depende de {top.length} obras.
            </strong>{" "}
            {projectLabel(top[0])} por sí sola absorbe{" "}
            {leaderShare > 0.5 ? "más de la mitad" : `el ${formatPercent(leaderShare)}`} de las horas imputadas.
          </p>
        </aside>
      )}
    </div>
  );
}
