"use client";

import { useState } from "react";
import { formatHours, formatPercent } from "@/lib/dashboard";
import type { OvertimeEmployee } from "@/lib/odoo";
import { downloadXlsx } from "@/lib/xlsx";

type Props = {
  total: number;
  projectCount: number;
  topShare: number;
  overtime50: number;
  overtime100: number;
  overtimeEmployees: OvertimeEmployee[];
  period: string;
};

/** KPIs del dashboard; el de horas extra despliega el detalle por empleado. */
export default function KpiRow({ total, projectCount, topShare, overtime50, overtime100, overtimeEmployees, period }: Props) {
  const [open, setOpen] = useState(false);

  function exportOvertime() {
    downloadXlsx(`horas-extra_${period}`, [
      {
        name: "Horas extra",
        widths: [32, 12, 12, 12],
        rows: [
          ["Empleado", "HS 50%", "HS 100%", "Total"],
          ...overtimeEmployees.map((line) => [line.name, line.hours_50, line.hours_100, line.hours_50 + line.hours_100]),
          ["Total", overtime50, overtime100, overtime50 + overtime100],
        ],
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
        <button
          type="button"
          className={open ? "card kpi kpi-button open" : "card kpi kpi-button"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className="kpi-label">Horas extra</span>
          <span className="kpi-split">
            <span>
              <span className="kpi-value">{formatHours(overtime50)} h</span>
              <span className="kpi-label"> al 50%</span>
            </span>
            <span>
              <span className="kpi-value">{formatHours(overtime100)} h</span>
              <span className="kpi-label"> al 100%</span>
            </span>
          </span>
          <span className="kpi-hint">{open ? "Ocultar detalle ▴" : "Ver detalle por empleado ▾"}</span>
        </button>
      </div>

      {open && (
        <section className="card chart-card">
          <div className="chart-head">
            <h2>Horas extra por empleado</h2>
            {overtimeEmployees.length > 0 && (
              <button type="button" className="btn btn-secondary" onClick={exportOvertime}>
                Exportar a Excel
              </button>
            )}
          </div>
          {!overtimeEmployees.length ? (
            <p className="muted small">No hay horas al 50% ni al 100% en este intervalo.</p>
          ) : (
            <div className="table-wrap">
              <table className="grid-table data-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th className="num">HS 50%</th>
                    <th className="num">HS 100%</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {overtimeEmployees.map((line) => (
                    <tr key={line.id}>
                      <td>{line.name}</td>
                      <td className="num">{formatHours(line.hours_50)}</td>
                      <td className="num">{formatHours(line.hours_100)}</td>
                      <td className="num">{formatHours(line.hours_50 + line.hours_100)}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td>Total</td>
                    <td className="num">{formatHours(overtime50)}</td>
                    <td className="num">{formatHours(overtime100)}</td>
                    <td className="num">{formatHours(overtime50 + overtime100)}</td>
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
