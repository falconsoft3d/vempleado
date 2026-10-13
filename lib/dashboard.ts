import type { DashboardProject } from "./odoo";

const hoursFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

export const formatHours = (hours: number) => hoursFormat.format(hours);
export const formatPercent = (share: number) => `${percentFormat.format(share * 100)}%`;

/** Código de la obra (campo Código del proyecto, ej. 42805). */
export function projectCode(project: DashboardProject) {
  return project.code;
}

// Rampa secuencial de #714B67 (claro → oscuro), validada: un tono, luminosidad monótona, extremo claro ≥ 2:1
export const RAMP = ["#c2a5ba", "#a5809b", "#8a6380", "#714b67", "#563850", "#3d2638"];
const DARK_INK_STEPS = 2; // los dos pasos más claros llevan texto oscuro; el resto, blanco

/** Más horas = paso más oscuro (escala raíz: con una obra dominante, las medianas siguen distinguiéndose). */
export function rampStep(value: number, max: number) {
  return Math.min(RAMP.length - 1, Math.round(Math.sqrt(value / max) * (RAMP.length - 1)));
}
export const inkForStep = (step: number) => (step < DARK_INK_STEPS ? "#1d2330" : "#ffffff");

// ------------------------------------------------------- Treemap (squarified)

export type Rect = { x: number; y: number; w: number; h: number };

export function squarify<T extends { hours: number }>(items: T[], bounds: Rect): (T & Rect)[] {
  const total = items.reduce((acc, item) => acc + item.hours, 0);
  if (!total || bounds.w <= 0 || bounds.h <= 0) return [];
  const scale = (bounds.w * bounds.h) / total;
  const nodes = items.filter((item) => item.hours > 0).map((item) => ({ item, area: item.hours * scale }));
  const out: (T & Rect)[] = [];

  const worst = (row: typeof nodes, side: number) => {
    const sum = row.reduce((acc, node) => acc + node.area, 0);
    const max = Math.max(...row.map((node) => node.area));
    const min = Math.min(...row.map((node) => node.area));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };

  const layoutRow = (row: typeof nodes, rect: Rect): Rect => {
    const sum = row.reduce((acc, node) => acc + node.area, 0);
    if (rect.w >= rect.h) {
      const width = sum / rect.h;
      let y = rect.y;
      for (const node of row) {
        const height = node.area / width;
        out.push({ ...node.item, x: rect.x, y, w: width, h: height });
        y += height;
      }
      return { x: rect.x + width, y: rect.y, w: rect.w - width, h: rect.h };
    }
    const height = sum / rect.w;
    let x = rect.x;
    for (const node of row) {
      const width = node.area / height;
      out.push({ ...node.item, x, y: rect.y, w: width, h: height });
      x += width;
    }
    return { x: rect.x, y: rect.y + height, w: rect.w, h: rect.h - height };
  };

  let rect = { ...bounds };
  let row: typeof nodes = [];
  let index = 0;
  while (index < nodes.length) {
    const side = Math.min(rect.w, rect.h);
    const candidate = [...row, nodes[index]];
    if (!row.length || worst(candidate, side) <= worst(row, side)) {
      row = candidate;
      index++;
    } else {
      rect = layoutRow(row, rect);
      row = [];
    }
  }
  if (row.length) layoutRow(row, rect);
  return out;
}

// ------------------------------------------------------- Intervalos

const DAY = 86_400_000;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);

export function presets(now = new Date()) {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return [
    // Mes y año completos: incluyen horas ya cargadas para días posteriores a hoy
    {
      label: "Este mes",
      from: iso(Date.UTC(now.getFullYear(), now.getMonth(), 1)),
      to: iso(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)),
    },
    { label: "Últimos 30 días", from: iso(today - 29 * DAY), to: iso(today) },
    { label: "Últimos 90 días", from: iso(today - 89 * DAY), to: iso(today) },
    { label: "Este año", from: iso(Date.UTC(now.getFullYear(), 0, 1)), to: iso(Date.UTC(now.getFullYear(), 11, 31)) },
  ];
}
