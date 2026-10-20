"use client";

import { useEffect, useState } from "react";
import { EMPLOYEE_PALETTE, formatHours, formatPercent, projectLabel } from "@/lib/dashboard";
import type { DashboardProject } from "@/lib/odoo";
import PieChart from "./PieChart";
import Treemap, { type ChartProps } from "./Treemap";

const TREEMAP_LABELED = 5;
const CHART_KIND_KEY = "vempleado.effortChart";

type Kind = "treemap" | "pie";

function ChartToggle({ kind, onChange }: { kind: Kind; onChange: (kind: Kind) => void }) {
  return (
    <div className="chart-toggle" role="group" aria-label="Tipo de gráfico">
      <button
        type="button"
        aria-pressed={kind === "treemap"}
        title="Ver como cuadrados"
        aria-label="Ver como cuadrados"
        onClick={() => onChange("treemap")}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <rect x="2" y="2" width="9" height="16" rx="1" />
          <rect x="13" y="2" width="5" height="7" rx="1" />
          <rect x="13" y="11" width="5" height="7" rx="1" />
        </svg>
      </button>
      <button
        type="button"
        aria-pressed={kind === "pie"}
        title="Ver como torta"
        aria-label="Ver como torta"
        onClick={() => onChange("pie")}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 2a8 8 0 1 0 8 8h-8z" />
          <path d="M12 0.5a7.5 7.5 0 0 1 7.5 7.5H12z" />
        </svg>
      </button>
    </div>
  );
}

/** Obras en cuadrados o torta; al hacer clic en una obra muestra, en naranja, el reparto de sus horas por empleado. */
export default function EffortSection({ projects, total }: { projects: DashboardProject[]; total: number }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [kind, setKind] = useState<Kind>("treemap");
  // Si cambia el filtro y la obra ya no está, se vuelve a la vista de obras
  const selected = projects.find((project) => project.id === selectedId);

  useEffect(() => {
    try {
      if (localStorage.getItem(CHART_KIND_KEY) === "pie") setKind("pie");
    } catch {}
  }, []);

  function changeKind(next: Kind) {
    setKind(next);
    try {
      localStorage.setItem(CHART_KIND_KEY, next);
    } catch {}
  }

  // Función (no componente) para no volver a montar el gráfico en cada render
  const chart = (props: ChartProps) => (kind === "pie" ? <PieChart {...props} /> : <Treemap {...props} />);
  const toggle = <ChartToggle kind={kind} onChange={changeKind} />;

  if (selected) {
    // Sin datos por empleado si Odoo aún no tiene esta versión
    const employees = selected.employees ?? [];
    const top = employees[0];
    return (
      <section className="card chart-card">
        <div className="chart-head">
          <h2>
            Horas por empleado en {projectLabel(selected)} ({formatHours(selected.hours)} h)
          </h2>
          <div className="chart-actions">
            {toggle}
            <button type="button" className="btn btn-secondary" onClick={() => setSelectedId(null)}>
              ← Todas las obras
            </button>
          </div>
        </div>
        <p className="muted small">Cada bloque es un empleado; su tamaño y su tono son proporcionales a sus horas en la obra.</p>
        <div className="chart-with-notes">
          {chart({ items: employees, total: selected.hours, palette: EMPLOYEE_PALETTE })}
          <div className="notes">
            {top && (
              <aside className="callout">
                <p>
                  {top.name} imputó el <strong>{formatPercent(top.hours / selected.hours)}</strong> de las horas de la
                  obra.
                </p>
              </aside>
            )}
            <aside className="callout">
              <p>
                {employees.length === 1
                  ? "Un solo empleado imputó horas en esta obra."
                  : `${employees.length} empleados imputaron horas en esta obra.`}
              </p>
            </aside>
          </div>
        </div>
      </section>
    );
  }

  const leader = projects[0];
  const minor = projects.slice(TREEMAP_LABELED);
  const minorShare = minor.reduce((acc, project) => acc + project.hours, 0) / (total || 1);
  return (
    <section className="card chart-card">
      <div className="chart-head">
        <h2>Distribución del esfuerzo en obras ({formatHours(total)} h)</h2>
        {toggle}
      </div>
      <p className="muted small">
        Cada bloque es una obra; su tamaño y su tono son proporcionales a las horas. Haz clic en una obra para ver quién
        trabajó en ella.
      </p>
      <div className="chart-with-notes">
        {chart({
          items: projects.map((project) => ({ ...project, detail: project.client })),
          total,
          onSelect: setSelectedId,
        })}
        <div className="notes">
          <aside className="callout">
            <p>
              La obra {projectLabel(leader)} consumió el <strong>{formatPercent(leader.hours / total)}</strong> del total
              de las horas asignadas a obras.
            </p>
          </aside>
          {minor.length > 1 && (
            <aside className="callout">
              <p>
                {minor.length} obras distintas se reparten apenas el <strong>{formatPercent(minorShare)}</strong> del
                tiempo restante.
              </p>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
