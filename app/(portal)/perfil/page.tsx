import Avatar from "@/components/Avatar";
import { requireEmployee } from "@/lib/session";
import PasswordForm from "./PasswordForm";

export default async function ProfilePage() {
  const { employee } = await requireEmployee();

  const details: [string, string | null][] = [
    ["Usuario BIM", employee.bim_user],
    ["Puesto", employee.job_title],
    ["Departamento", employee.department],
    ["Responsable", employee.parent],
    ["Compañía", employee.company],
    ["Correo de trabajo", employee.work_email],
    ["Teléfono laboral", employee.work_phone],
    ["Celular", employee.mobile_phone],
  ];

  return (
    <>
      <header className="page-header">
        <h1>Perfil</h1>
      </header>
      <div className="grid">
        <section className="card">
          <div className="profile-head">
            <Avatar name={employee.name} image={employee.image} size={64} />
            <div>
              <h2>{employee.name}</h2>
              {employee.job_title && <p className="muted">{employee.job_title}</p>}
            </div>
          </div>
          <dl className="details">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="card">
          <h2>Cambiar contraseña</h2>
          <p className="muted">Al cambiarla se cerrarán tus otras sesiones abiertas.</p>
          <PasswordForm />
        </section>
      </div>
    </>
  );
}
