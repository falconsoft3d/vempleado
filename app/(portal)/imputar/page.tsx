import ImputationWizard from "@/components/imputation/ImputationWizard";
import { currentWeek } from "@/lib/imputation";
import { getImputationOptions, OdooError, type ImputationOptions } from "@/lib/odoo";
import { requireEmployee } from "@/lib/session";

export default async function ImputarPage() {
  const { session } = await requireEmployee();

  let options: ImputationOptions | null = null;
  let error: string | null = null;
  try {
    options = await getImputationOptions(session.url, session.token);
  } catch (e) {
    if (!(e instanceof OdooError)) throw e;
    error = e.message;
  }
  const [defaultFrom, defaultTo] = currentWeek();

  return (
    <>
      <header className="page-header">
        <h1>Imputar horas</h1>
        <p className="muted">Elige el empleado o grupo, los proyectos y el intervalo; después completa la grilla.</p>
      </header>
      {!options ? (
        <p className="alert alert-error">{error}</p>
      ) : !options.hour_types.length ? (
        <p className="alert alert-info">No hay tipos de hora habilitados para el portal.</p>
      ) : (
        <ImputationWizard options={options} defaultFrom={defaultFrom} defaultTo={defaultTo} />
      )}
    </>
  );
}
