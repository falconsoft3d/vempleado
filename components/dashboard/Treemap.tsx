"use client";

import { useEffect, useRef, useState } from "react";
import {
  chartItemLabel as itemLabel,
  formatHours,
  formatPercent,
  inkForStep,
  PROJECT_PALETTE,
  rampStep,
  squarify,
  type ChartItem,
  type Palette,
} from "@/lib/dashboard";

export type ChartProps = { items: ChartItem[]; total: number; palette?: Palette; onSelect?: (id: number) => void };
type Tip = { item: ChartItem; x: number; y: number };

const showName = (item: ChartItem) => item.name !== item.code;

export default function Treemap({ items, total, palette = PROJECT_PALETTE, onSelect }: ChartProps) {
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

  const max = items[0]?.hours ?? 1;
  const tiles = squarify(items, { x: 0, y: 0, w: size.w, h: size.h });

  return (
    <div ref={ref} className="treemap" style={{ height: size.h || 320 }} onPointerLeave={() => setTip(null)}>
      {tiles.map((tile) => {
        const step = rampStep(tile.hours, max);
        const big = tile.w >= 150 && tile.h >= 70;
        const medium = tile.w >= 80 && tile.h >= 44;
        const label = `${itemLabel(tile)}: ${formatHours(tile.hours)} horas (${formatPercent(tile.hours / total)})`;
        const code = tile.code ? `[${tile.code}] · ` : "";
        return (
          <div
            key={tile.id}
            className={onSelect ? "treemap-tile clickable" : "treemap-tile"}
            tabIndex={0}
            role={onSelect ? "button" : "img"}
            aria-label={label}
            style={{
              left: tile.x,
              top: tile.y,
              width: tile.w,
              height: tile.h,
              background: palette.ramp[step],
              color: inkForStep(step, palette.darkInkSteps),
            }}
            onPointerMove={(event) => {
              const box = ref.current!.getBoundingClientRect();
              setTip({ item: tile, x: event.clientX - box.left, y: event.clientY - box.top });
            }}
            onFocus={() => setTip({ item: tile, x: tile.x + tile.w / 2, y: tile.y + tile.h / 2 })}
            onBlur={() => setTip(null)}
            onClick={onSelect && (() => onSelect(tile.id))}
            onKeyDown={
              onSelect &&
              ((event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(tile.id);
                }
              })
            }
          >
            {big ? (
              <>
                {showName(tile) && <strong className="tile-title tile-name">{tile.name}</strong>}
                <span>
                  {code}
                  {formatHours(tile.hours)} horas
                </span>
              </>
            ) : medium ? (
              <>
                {showName(tile) && <span className="tile-small tile-name">{tile.name}</span>}
                <span className="tile-small">
                  {tile.code ? `[${tile.code}] ` : ""}({formatHours(tile.hours)}h)
                </span>
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
          <strong>
            {formatHours(tip.item.hours)} h · {formatPercent(tip.item.hours / total)}
          </strong>
          <span>{itemLabel(tip.item)}</span>
          {tip.item.detail && <span className="muted">{tip.item.detail}</span>}
        </div>
      )}
    </div>
  );
}
