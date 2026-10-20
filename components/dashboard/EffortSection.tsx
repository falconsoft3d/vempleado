"use client";

import { useState } from "react";
import { EMPLOYEE_PALETTE, formatHours, formatPercent, projectLabel } from "@/lib/dashboard";
import type { DashboardProject } from "@/lib/odoo";
import Treemap from "./Treemap";

const TREEMAP_LABELED = 5;

/** Treemap de obras; al hacer clic en una obra muestra, en naranja, el reparto de sus horas por empleado. */
export default function EffortSection({ projects, total }: { projects: DashboardProject[]; total: number }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Si cambia el filtro y la obra ya no está, se vuelve a la vista de obras
  const selected = projects.find((project) => project.id === selectedId);

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
          <button type="button" className="btn btn-secondary" onClick={() => setSelectedId(null)}>
            ← Todas las obras
          </button>
        </div>
        <p className="muted small">Cada bloque es un empleado; su tamaño y su tono son proporcionales a sus horas en la obra.</p>
        <div className="chart-with-notes">
          <Treemap items={employees} total={selected.hours} palette={EMPLOYEE_PALETTE} />
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
      <h2>Distribución del esfuerzo en obras ({formatHours(total)} h)</h2>
      <p className="muted small">
        Cada bloque es una obra; su tamaño y su tono son proporcionales a las horas. Haz clic en una obra para ver quién
        trabajó en ella.
      </p>
      <div className="chart-with-notes">
        <Treemap
          items={projects.map((project) => ({ ...project, detail: project.client }))}
          total={total}
          onSelect={setSelectedId}
        />
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
