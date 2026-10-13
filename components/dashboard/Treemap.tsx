"use client";

import { useEffect, useRef, useState } from "react";
import { formatHours, formatPercent, inkForStep, projectCode, RAMP, rampStep, squarify } from "@/lib/dashboard";
import type { DashboardProject } from "@/lib/odoo";

type Tip = { project: DashboardProject; x: number; y: number };

export default function Treemap({ projects, total }: { projects: DashboardProject[]; total: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setSize({ w: width, h: Math.max(280, Math.min(460, width * 0.56)) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const max = projects[0]?.hours ?? 1;
  const tiles = squarify(projects, { x: 0, y: 0, w: size.w, h: size.h });

  return (
    <div ref={ref} className="treemap" style={{ height: size.h || 320 }} onPointerLeave={() => setTip(null)}>
      {tiles.map((tile) => {
        const step = rampStep(tile.hours, max);
        const big = tile.w >= 150 && tile.h >= 70;
        const medium = tile.w >= 80 && tile.h >= 44;
        const label = `${projectCode(tile)}: ${formatHours(tile.hours)} horas (${formatPercent(tile.hours / total)})`;
        return (
          <div
            key={tile.id}
            className="treemap-tile"
            tabIndex={0}
            role="img"
            aria-label={label}
            style={{
              left: tile.x,
              top: tile.y,
              width: tile.w,
              height: tile.h,
              background: RAMP[step],
              color: inkForStep(step),
            }}
            onPointerMove={(event) => {
              const box = ref.current!.getBoundingClientRect();
              setTip({ project: tile, x: event.clientX - box.left, y: event.clientY - box.top });
            }}
            onFocus={() => setTip({ project: tile, x: tile.x + tile.w / 2, y: tile.y + tile.h / 2 })}
            onBlur={() => setTip(null)}
          >
            {big ? (
              <>
                <strong className="tile-title">{projectCode(tile)}</strong>
                <span>{formatHours(tile.hours)} horas</span>
              </>
            ) : medium ? (
              <>
                <span className="tile-small">{projectCode(tile)}</span>
                <span className="tile-small">({formatHours(tile.hours)}h)</span>
              </>
            ) : null}
          </div>
        );
      })}
      {tip && (
        <div
          className="chart-tooltip"
          style={{
            left: Math.min(tip.x + 12, Math.max(0, size.w - 230)),
            top: tip.y + 12 > size.h - 90 ? tip.y - 90 : tip.y + 12,
          }}
        >
          <strong>{formatHours(tip.project.hours)} h · {formatPercent(tip.project.hours / total)}</strong>
          <span>{projectCode(tip.project)}</span>
          <span className="muted">{tip.project.name}</span>
          {tip.project.client && <span className="muted">{tip.project.client}</span>}
        </div>
      )}
    </div>
  );
}
