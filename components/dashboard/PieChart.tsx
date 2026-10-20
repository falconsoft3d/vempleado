"use client";

import { useRef, useState } from "react";
import {
  chartItemLabel,
  formatHours,
  formatPercent,
  inkForStep,
  PROJECT_PALETTE,
  rampStep,
  type ChartItem,
} from "@/lib/dashboard";
import type { ChartProps } from "./Treemap";

const SIZE = 240;
const OUTER = 116;
const INNER = 64;
const LABEL_MIN_SHARE = 0.05; // porciones más chicas: solo tooltip y leyenda

type Tip = { item: ChartItem; x: number; y: number };

/** Punto del círculo a "turn" vueltas desde las 12, en sentido horario. */
function point(radius: number, turn: number) {
  const angle = turn * 2 * Math.PI - Math.PI / 2;
  return [SIZE / 2 + radius * Math.cos(angle), SIZE / 2 + radius * Math.sin(angle)];
}

/** Porción de anillo entre start y end (en vueltas). */
function slicePath(start: number, end: number) {
  const sweep = Math.min(end - start, 0.9999); // una sola porción: casi el círculo completo
  const large = sweep > 0.5 ? 1 : 0;
  const [x1, y1] = point(OUTER, start);
  const [x2, y2] = point(OUTER, start + sweep);
  const [x3, y3] = point(INNER, start + sweep);
  const [x4, y4] = point(INNER, start);
  return `M${x1} ${y1}A${OUTER} ${OUTER} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${INNER} ${INNER} 0 ${large} 0 ${x4} ${y4}Z`;
}

/** Torta (anillo) con la misma paleta que el treemap; la leyenda sigue el orden de las porciones. */
export default function PieChart({ items, total, palette = PROJECT_PALETTE, onSelect }: ChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const max = items[0]?.hours ?? 1;
  const sum = items.reduce((acc, item) => acc + item.hours, 0) || 1;

  let cursor = 0;
  const slices = items
    .filter((item) => item.hours > 0)
    .map((item) => {
      const start = cursor;
      cursor += item.hours / sum;
      const step = rampStep(item.hours, max);
      return { item, start, end: cursor, step, color: palette.ramp[step] };
    });

  function showTip(item: ChartItem, event: React.PointerEvent) {
    const box = ref.current!.getBoundingClientRect();
    setTip({ item, x: event.clientX - box.left, y: event.clientY - box.top });
  }

  return (
    <div className="pie" ref={ref} onPointerLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="pie-svg" role="group" aria-label="Gráfico de torta">
        {slices.map(({ item, start, end, step, color }) => {
          const share = item.hours / total;
          const [lx, ly] = point((OUTER + INNER) / 2, (start + end) / 2);
          const label = `${chartItemLabel(item)}: ${formatHours(item.hours)} horas (${formatPercent(share)})`;
          return (
            <g
              key={item.id}
              className={onSelect ? "pie-slice clickable" : "pie-slice"}
              tabIndex={0}
              role={onSelect ? "button" : "img"}
              aria-label={label}
              onPointerMove={(event) => showTip(item, event)}
              onFocus={() => setTip({ item, x: lx, y: ly })}
              onBlur={() => setTip(null)}
              onClick={onSelect && (() => onSelect(item.id))}
              onKeyDown={
                onSelect &&
                ((event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(item.id);
                  }
                })
              }
            >
              <path d={slicePath(start, end)} fill={color} />
              {end - start >= LABEL_MIN_SHARE && (
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill={inkForStep(step, palette.darkInkSteps)}>
                  {formatPercent(share)}
                </text>
              )}
            </g>
          );
        })}
        <text x={SIZE / 2} y={SIZE / 2 - 8} textAnchor="middle" className="pie-total">
          {formatHours(total)} h
        </text>
        <text x={SIZE / 2} y={SIZE / 2 + 14} textAnchor="middle" className="pie-caption">
          {slices.length} {slices.length === 1 ? "bloque" : "bloques"}
        </text>
      </svg>
      <ul className="pie-legend">
        {slices.map(({ item, color }) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={!onSelect}
              onClick={() => onSelect?.(item.id)}
              onPointerEnter={() => setTip(null)}
            >
              <span className="swatch" style={{ background: color }} />
              <span className="legend-name">{chartItemLabel(item)}</span>
              <span className="muted">
                {formatHours(item.hours)} h · {formatPercent(item.hours / total)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {tip && (
        <div
          className="chart-tooltip"
          style={{ left: Math.min(tip.x + 12, Math.max(0, (ref.current?.clientWidth ?? 0) - 230)), top: tip.y + 12 }}
        >
          <strong>
            {formatHours(tip.item.hours)} h · {formatPercent(tip.item.hours / total)}
          </strong>
          <span>{chartItemLabel(tip.item)}</span>
          {tip.item.detail && <span className="muted">{tip.item.detail}</span>}
        </div>
      )}
    </div>
  );
}
