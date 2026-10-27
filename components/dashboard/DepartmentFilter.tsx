"use client";

import type { Named } from "@/lib/odoo";

/** Filtro por departamento: al cambiarlo se envía el formulario para refrescar la lista de empleados. */
export default function DepartmentFilter({ departments, value }: { departments: Named[]; value: number | null }) {
  return (
    <label>
      Departamento
      <select
        name="dept"
        defaultValue={value ?? ""}
        onChange={(event) => {
          const form = event.currentTarget.form;
          // Los empleados marcados son del departamento anterior
          form?.querySelectorAll<HTMLInputElement>('input[name="emp"]').forEach((input) => (input.checked = false));
          form?.requestSubmit();
        }}
      >
        <option value="">Todos</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </select>
    </label>
  );
}
