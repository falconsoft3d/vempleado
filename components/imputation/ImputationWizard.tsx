"use client";

import { useState, useTransition } from "react";
import { loadImputationAction } from "@/app/actions";
import { buildGrid, selectedEmployees, validateFilter, type Filter, type Grid } from "@/lib/imputation";
import type { ImputationOptions } from "@/lib/odoo";
import FilterStep from "./FilterStep";
import GridStep from "./GridStep";

type Props = { options: ImputationOptions; defaultFrom: string; defaultTo: string };

export default function ImputationWizard({ options, defaultFrom, defaultTo }: Props) {
  const [filter, setFilter] = useState<Filter>({
    target: "me",
    excluded: [],
    projectIds: options.projects.length === 1 ? [options.projects[0].id] : [],
    favoriteId: null,
    dateFrom: defaultFrom,
    dateTo: defaultTo,
  });
  const [grid, setGrid] = useState<Grid | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const employees = selectedEmployees(options, filter);

  function next() {
    const problem = validateFilter(filter, employees);
    setError(problem);
    if (problem) return;
    startTransition(async () => {
      const result = await loadImputationAction(
        employees.map((employee) => employee.id),
        filter.dateFrom,
        filter.dateTo,
      );
      if (!result.ok) setError(result.error);
      else setGrid(buildGrid(options, filter, employees, result));
    });
  }

  return (
    <>
      <ol className="steps">
        <li className={grid ? "" : "active"}>1. Filtro</li>
        <li className={grid ? "active" : ""}>2. Grilla de carga</li>
      </ol>
      {grid ? (
        <GridStep options={options} grid={grid} onBack={() => setGrid(null)} />
      ) : (
        <FilterStep
          options={options}
          filter={filter}
          onChange={setFilter}
          error={error}
          pending={pending}
          onNext={next}
        />
      )}
    </>
  );
}
