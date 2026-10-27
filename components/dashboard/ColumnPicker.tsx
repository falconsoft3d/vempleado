"use client";

import { useEffect, useState } from "react";

export type Column = { key: string; label: string };

const HIDDEN_COLUMNS_KEY = "vempleado.dashboard.hiddenColumns";

/** Columnas ocultas de cada tabla del dashboard (por clave de tabla), recordadas en este navegador. */
export function useHiddenColumns() {
  const [hidden, setHidden] = useState<Record<string, string[]>>({});

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HIDDEN_COLUMNS_KEY) ?? "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved)) setHidden(saved);
    } catch {}
  }, []);

  function toggle(table: string, column: string) {
    setHidden((previous) => {
      const current = previous[table] ?? [];
      const next = {
        ...previous,
        [table]: current.includes(column) ? current.filter((key) => key !== column) : [...current, column],
      };
      try {
        localStorage.setItem(HIDDEN_COLUMNS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return [hidden, toggle] as const;
}

/** Menú para mostrar u ocultar columnas; la primera (el nombre de la fila) siempre se ve. */
export default function ColumnPicker({
  fixed,
  columns,
  hidden,
  onToggle,
}: {
  fixed: string;
  columns: Column[];
  hidden: string[];
  onToggle: (key: string) => void;
}) {
  const shown = columns.filter((column) => !hidden.includes(column.key)).length;
  return (
    <details className="column-picker">
      <summary className="btn btn-secondary">
        Columnas{shown < columns.length && ` (${shown + 1}/${columns.length + 1})`}
      </summary>
      <div className="column-menu align-right">
        <label>
          <input type="checkbox" checked disabled />
          {fixed}
        </label>
        {columns.map((column) => (
          <label key={column.key}>
            <input type="checkbox" checked={!hidden.includes(column.key)} onChange={() => onToggle(column.key)} />
            {column.label}
          </label>
        ))}
      </div>
    </details>
  );
}
