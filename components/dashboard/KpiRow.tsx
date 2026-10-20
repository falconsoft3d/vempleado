"use client";

import { useState } from "react";
import { formatHours, formatPercent } from "@/lib/dashboard";
import type { DayFlagEmployee, OvertimeEmployee } from "@/lib/odoo";
import { downloadXlsx, type Cell } from "@/lib/xlsx";

type Props = {
  total: number;
  projectCount: number;
  topShare: number;
  overtime50: number;
  overtime100: number;
  overtimeEmployees: OvertimeEmployee[];
  plusDistanciaDays: number;
  hsNocturnaDays: number;
  dayFlagEmployees: DayFlagEmployee[];
  period: string;
};

/** Detalle por empleado que despliega un KPI: encabezados, filas y fila de totales (números ya sumados). */
type Detail = { title: string; file: string; empty: string; header: string[]; rows: Cell[][]; totals: Cell[] };
type Open = "overtime" | "plus_distancia" | "hs_nocturna" | null;

const days = (count: number) => `${count} ${count === 1 ? "día" : "días"}`;
const formatCell = (value: Cell) => (typeof value === "number" ? formatHours(value) : value ?? "—");

/** KPIs del dashboard; los de horas extra, Plus Distancia y HS Nocturna despliegan el detalle por empleado. */
export default function KpiRow(props: Props) {
  const { total, projectCount, topShare, overtime50, overtime100, overtimeEmployees } = props;
  const { plusDistanciaDays, hsNocturnaDays, dayFlagEmployees, period } = props;
  const [open, setOpen] = useState<Open>(null);

  function flagDetail(flag: "plus_distancia" | "hs_nocturna", name: string, count: number): Detail {
    const lines = dayFlagEmployees.filter((line) => line[flag] > 0).sort((a, b) => b[flag] - a[flag]);
    return {
      title: `${name} por empleado`,
      file: `${flag.replace("_", "-")}_${period}`,
      empty: `No hay días con ${name} en este intervalo.`,
      header: ["Empleado", "Días"],
      rows: lines.map((line) => [line.name, line[flag]]),
      totals: ["Total", count],
    };
  }

  const details: Record<Exclude<Open, null>, Detail> = {
    overtime: {
      title: "Horas extra por empleado",
      file: `horas-extra_${period}`,
      empty: "No hay horas al 50% ni al 100% en este intervalo.",
      header: ["Empleado", "HS 50%", "HS 100%", "Total"],
      rows: overtimeEmployees.map((line) => [line.name, line.hours_50, line.hours_100, line.hours_50 + line.hours_100]),
      totals: ["Total", overtime50, overtime100, overtime50 + overtime100],
    },
    plus_distancia: flagDetail("plus_distancia", "Plus Distancia", plusDistanciaDays),
    hs_nocturna: flagDetail("hs_nocturna", "HS Nocturna", hsNocturnaDays),
  };
  const detail = open && details[open];

  /** Tarjeta KPI que abre o cierra su detalle. */
  function kpiButton(key: Exclude<Open, null>, label: string, value: React.ReactNode) {
    const active = open === key;
    return (
      <button
        type="button"
        className={active ? "card kpi kpi-button open" : "card kpi kpi-button"}
        aria-expanded={active}
        onClick={() => setOpen(active ? null : key)}
      >
        <span className="kpi-label">{label}</span>
        {value}
        <span className="kpi-hint">{active ? "Ocultar detalle ▴" : "Ver detalle por empleado ▾"}</span>
      </button>
    );
  }

  function exportDetail(current: Detail) {
    downloadXlsx(current.file, [
      {
        name: current.title,
        widths: [32, ...current.header.slice(1).map(() => 12)],
        rows: [current.header, ...current.rows, current.totals],
      },
    ]);
  }

  return (
    <>
      <div className="kpis">
        <div className="card kpi kpi-hero">
          <span className="kpi-label">Horas imputadas a obras</span>
          <span className="kpi-value">{formatHours(total)} h</span>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Obras con horas</span>
          <span className="kpi-value">{projectCount}</span>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Concentración en las 3 principales</span>
          <span className="kpi-value">{formatPercent(topShare)}</span>
        </div>
      </div>
      <div className="kpis">
        {kpiButton(
          "overtime",
          "Horas extra",
          <span className="kpi-split">
            <span>
              <span className="kpi-value">{formatHours(overtime50)} h</span>
              <span className="kpi-label"> al 50%</span>
            </span>
            <span>
              <span className="kpi-value">{formatHours(overtime100)} h</span>
              <span className="kpi-label"> al 100%</span>
            </span>
          </span>,
        )}
        {kpiButton("plus_distancia", "Plus Distancia", <span className="kpi-value">{days(plusDistanciaDays)}</span>)}
        {kpiButton("hs_nocturna", "HS Nocturna", <span className="kpi-value">{days(hsNocturnaDays)}</span>)}
      </div>

      {detail && (
        <section className="card chart-card">
          <div className="chart-head">
            <h2>{detail.title}</h2>
            {detail.rows.length > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => exportDetail(detail)}>
                Exportar a Excel
              </button>
            )}
          </div>
          {!detail.rows.length ? (
            <p className="muted small">{detail.empty}</p>
          ) : (
            <div className="table-wrap">
              <table className="grid-table data-table">
                <thead>
                  <tr>
                    {detail.header.map((title, i) => (
                      <th key={title} className={i ? "num" : undefined}>
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((value, i) => (
                        <td key={i} className={i ? "num" : undefined}>
                          {formatCell(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="total-row">
                    {detail.totals.map((value, i) => (
                      <td key={i} className={i ? "num" : undefined}>
                        {formatCell(value)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
