"use client";

import { Fragment, useState } from "react";
import { formatHours, formatPercent, projectLabel } from "@/lib/dashboard";
import type { DashboardEmployee, DashboardProject, Named } from "@/lib/odoo";
import type { Sheet } from "@/lib/xlsx";

/** Una fila del detalle (empleado o departamento) con el reparto de sus horas que se despliega al hacer clic. */
export type Group = {
  id: number;
  name: string;
  /** Valores de las columnas propias de la agrupación (ver Grouping.columns). */
  columns: (string | number | null)[];
  hours: number;
  items: (Named & { hours: number })[];
};

/** Cómo se muestra cada agrupación: encabezados de la tabla, del desplegable y del Excel. */
export type Grouping = {
  title: string;
  header: string;
  columns: { header: string; num?: boolean; width: number }[];
  itemHeader: string;
  hint: string;
};

export const BY_EMPLOYEE: Grouping = {
  title: "Detalle por empleado",
  header: "Empleado",
  columns: [
    { header: "Departamento", width: 28 },
    { header: "Puesto de trabajo", width: 28 },
  ],
  itemHeader: "Obra",
  hint: "Haz clic en un empleado para ver sus horas por obra.",
};
export const BY_DEPARTMENT: Grouping = {
  title: "Detalle por departamento",
  header: "Departamento",
  columns: [{ header: "Empleados", num: true, width: 12 }],
  itemHeader: "Empleado",
  hint: "Haz clic en un departamento para ver sus horas por empleado.",
};

const NO_DEPARTMENT = "Sin departamento";
const byHours = <T extends { hours: number }>(items: T[]) => items.sort((a, b) => b.hours - a.hours);

/** Horas de cada empleado y su reparto por obra, de mayor a menor. */
export function employeeGroups(projects: DashboardProject[], employees: DashboardEmployee[], departments: Named[]) {
  const departmentName = new Map(departments.map((department) => [department.id, department.name]));
  const employeeDepartment = new Map(employees.map((employee) => [employee.id, employee.department_id ?? null]));
  const jobs = new Map(employees.map((employee) => [employee.id, employee.job]));
  const groups = new Map<number, Group>();
  for (const project of projects) {
    for (const employee of project.employees) {
      const departmentId = employeeDepartment.get(employee.id);
      const group = groups.get(employee.id) ?? {
        id: employee.id,
        name: employee.name,
        columns: [(departmentId && departmentName.get(departmentId)) || NO_DEPARTMENT, jobs.get(employee.id) ?? null],
        hours: 0,
        items: [],
      };
      group.hours += employee.hours;
      group.items.push({ id: project.id, name: projectLabel(project), hours: employee.hours });
      groups.set(employee.id, group);
    }
  }
  return byHours([...groups.values()]).map((group) => ({ ...group, items: byHours(group.items) }));
}

/** Horas de cada departamento y su reparto por empleado (los sin departamento van juntos, id 0). */
export function departmentGroups(employeeRows: Group[], employees: DashboardEmployee[], departments: Named[]) {
  const departmentName = new Map(departments.map((department) => [department.id, department.name]));
  const employeeDepartment = new Map(employees.map((employee) => [employee.id, employee.department_id ?? 0]));
  const groups = new Map<number, Group>();
  for (const row of employeeRows) {
    const departmentId = employeeDepartment.get(row.id) ?? 0;
    const group = groups.get(departmentId) ?? {
      id: departmentId,
      name: departmentName.get(departmentId) ?? NO_DEPARTMENT,
      columns: [],
      hours: 0,
      items: [],
    };
    group.hours += row.hours;
    group.items.push({ id: row.id, name: row.name, hours: row.hours });
    groups.set(departmentId, group);
  }
  return byHours([...groups.values()]).map((group) => ({ ...group, columns: [group.items.length] }));
}

const share = (hours: number, total: number) => Math.round((hours / (total || 1)) * 1000) / 10;

/** Hojas del Excel: el resumen por grupo y el reparto de cada grupo. */
export function groupSheets(grouping: Grouping, groups: Group[], total: number): Sheet[] {
  return [
    {
      name: grouping.title,
      widths: [36, ...grouping.columns.map((column) => column.width), 10, 8],
      rows: [
        [grouping.header, ...grouping.columns.map((column) => column.header), "Horas", "%"],
        ...groups.map((group) => [group.name, ...group.columns, group.hours, share(group.hours, total)]),
        ["Total", ...grouping.columns.map(() => ""), total, 100],
      ],
    },
    {
      name: "Reparto",
      widths: [36, 44, 10, 12],
      rows: [
        [grouping.header, grouping.itemHeader, "Horas", `% del ${grouping.header.toLowerCase()}`],
        ...groups.flatMap((group) =>
          group.items.map((item) => [group.name, item.name, item.hours, share(item.hours, group.hours)]),
        ),
      ],
    },
  ];
}

/** Tabla de empleados o departamentos; cada fila despliega su reparto. */
export default function BreakdownTable({
  grouping,
  groups,
  total,
}: {
  grouping: Grouping;
  groups: Group[];
  total: number;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const toggle = (id: number) => setOpenId((current) => (current === id ? null : id));

  return (
    <div className="table-wrap">
      <table className="grid-table data-table">
        <thead>
          <tr>
            <th>{grouping.header}</th>
            {grouping.columns.map((column) => (
              <th key={column.header} className={column.num ? "num" : undefined}>
                {column.header}
              </th>
            ))}
            <th className="num">Horas</th>
            <th className="num">%</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const open = openId === group.id;
            return (
              <Fragment key={group.id}>
                <tr
                  className={open ? "project-row open" : "project-row"}
                  tabIndex={0}
                  aria-expanded={open}
                  onClick={() => toggle(group.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggle(group.id);
                    }
                  }}
                >
                  <td>
                    <span className="caret" aria-hidden="true">
                      {open ? "▾" : "▸"}
                    </span>
                    {group.name}
                  </td>
                  {grouping.columns.map((column, index) => (
                    <td key={column.header} className={column.num ? "num" : undefined}>
                      {group.columns[index] ?? "—"}
                    </td>
                  ))}
                  <td className="num">{formatHours(group.hours)}</td>
                  <td className="num">{formatPercent(group.hours / (total || 1))}</td>
                </tr>
                {open && (
                  <tr className="detail-row">
                    <td colSpan={grouping.columns.length + 3}>
                      <div className="table-wrap detail-wrap">
                        <table className="grid-table data-table">
                          <thead>
                            <tr>
                              <th>{grouping.itemHeader}</th>
                              <th className="num">Horas</th>
                              <th className="num">% del {grouping.header.toLowerCase()}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((item) => (
                              <tr key={item.id}>
                                <td>{item.name}</td>
                                <td className="num">{formatHours(item.hours)}</td>
                                <td className="num">{formatPercent(item.hours / (group.hours || 1))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
