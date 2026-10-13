"use client";

import { useState } from "react";
import type { Filter } from "@/lib/imputation";
import type { ImputationOptions } from "@/lib/odoo";

type Props = {
  options: ImputationOptions;
  filter: Filter;
  onChange: (filter: Filter) => void;
  error: string | null;
  pending: boolean;
  onNext: () => void;
};

export default function FilterStep({ options, filter, onChange, error, pending, onNext }: Props) {
  const [query, setQuery] = useState("");
  const set = (patch: Partial<Filter>) => onChange({ ...filter, ...patch });
  const group = options.subgroups.find((subgroup) => `g${subgroup.id}` === filter.target);
  const visibleProjects = options.projects.filter((project) =>
    project.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function toggleProject(id: number) {
    const selected = filter.projectIds.includes(id);
    set({
      projectIds: selected ? filter.projectIds.filter((projectId) => projectId !== id) : [...filter.projectIds, id],
      favoriteId: selected && filter.favoriteId === id ? null : filter.favoriteId,
    });
  }

  function toggleFavorite(id: number) {
    set({
      favoriteId: filter.favoriteId === id ? null : id,
      projectIds: filter.projectIds.includes(id) ? filter.projectIds : [...filter.projectIds, id],
    });
  }

  function toggleMember(id: number) {
    const excluded = filter.excluded.includes(id);
    set({ excluded: excluded ? filter.excluded.filter((memberId) => memberId !== id) : [...filter.excluded, id] });
  }

  return (
    <div className="filter-grid">
      <section className="card">
        <h2>Empleado / grupo</h2>
        <div className="option-list">
          <label className={filter.target === "me" ? "option selected" : "option"}>
            <input type="radio" name="target" checked={filter.target === "me"} onChange={() => set({ target: "me", excluded: [] })} />
            <span>
              {options.me.name}
              <small>Yo</small>
            </span>
          </label>
          {options.subgroups.map((subgroup) => {
            const value = `g${subgroup.id}`;
            return (
              <label key={subgroup.id} className={filter.target === value ? "option selected" : "option"}>
                <input type="radio" name="target" checked={filter.target === value} onChange={() => set({ target: value, excluded: [] })} />
                <span>
                  {subgroup.name}
                  <small>Grupo · {subgroup.members.length} empleados</small>
                </span>
              </label>
            );
          })}
        </div>
        {!options.subgroups.length && (
          <p className="muted small">
            {options.me.name} no es supervisor de ningún subgrupo, por eso solo puede imputarse a sí mismo.
          </p>
        )}
        {group && (
          <>
            <p className="muted small">Integrantes (pulsa para excluir de la carga):</p>
            {group.members.length ? (
              <div className="chips">
                {group.members.map((member) => {
                  const off = filter.excluded.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      className={off ? "chip chip-off" : "chip"}
                      aria-pressed={!off}
                      onClick={() => toggleMember(member.id)}
                    >
                      {member.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="muted small">Este grupo no tiene empleados.</p>
            )}
          </>
        )}
      </section>

      <section className="card">
        <h2>Proyectos en los que trabajo</h2>
        <p className="muted small">Marca con ★ el preferido: se precargará en todos los días laborables.</p>
        {options.projects.length > 8 && (
          <input
            className="search"
            type="search"
            placeholder="Buscar proyecto…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        )}
        <div className="project-list">
          {visibleProjects.map((project) => {
            const selected = filter.projectIds.includes(project.id);
            const favorite = filter.favoriteId === project.id;
            return (
              <div key={project.id} className={selected ? "project-item selected" : "project-item"}>
                <label>
                  <input type="checkbox" checked={selected} onChange={() => toggleProject(project.id)} />
                  {project.name}
                </label>
                <button
                  type="button"
                  className={favorite ? "star active" : "star"}
                  onClick={() => toggleFavorite(project.id)}
                  aria-pressed={favorite}
                  title="Marcar como preferido"
                  aria-label={`Marcar ${project.name} como preferido`}
                >
                  ★
                </button>
              </div>
            );
          })}
          {!visibleProjects.length && <p className="muted small">No hay proyectos.</p>}
        </div>
      </section>

      <section className="card">
        <h2>Intervalo de tiempo</h2>
        <div className="form date-range">
          <label>
            Desde
            <input type="date" value={filter.dateFrom} onChange={(event) => set({ dateFrom: event.target.value })} />
          </label>
          <label>
            Hasta
            <input type="date" value={filter.dateTo} onChange={(event) => set({ dateTo: event.target.value })} />
          </label>
        </div>
        <p className="muted small">Sábados, domingos y feriados aparecen en rojo y sin horas.</p>
      </section>

      <div className="step-actions">
        {error && <p className="alert alert-error">{error}</p>}
        <button type="button" className="btn btn-primary" onClick={onNext} disabled={pending}>
          {pending ? "Cargando…" : "Siguiente →"}
        </button>
      </div>
    </div>
  );
}
