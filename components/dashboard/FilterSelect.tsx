"use client";

import type { Named } from "@/lib/odoo";

type Props = {
  label: string;
  name: string;
  options: Named[];
  value: number | null;
  /** Selects que dependen de este (ej. el puesto depende del departamento): vuelven a "Todos" al cambiarlo. */
  resets?: string[];
};

/** Filtro del dashboard (departamento, puesto): al cambiarlo se envía el formulario para refrescar los empleados. */
export default function FilterSelect({ label, name, options, value, resets = [] }: Props) {
  return (
    <label>
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        onChange={(event) => {
          const form = event.currentTarget.form;
          // Los empleados marcados y los filtros dependientes corresponden a la elección anterior
          form?.querySelectorAll<HTMLInputElement>('input[name="emp"]').forEach((input) => (input.checked = false));
          for (const reset of resets) {
            const select = form?.elements.namedItem(reset);
            if (select instanceof HTMLSelectElement) select.value = "";
          }
          form?.requestSubmit();
        }}
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
