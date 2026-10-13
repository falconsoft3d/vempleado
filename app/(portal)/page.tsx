import Link from "next/link";
import { requireEmployee } from "@/lib/session";

export default async function HomePage() {
  const { employee } = await requireEmployee();

  return (
    <>
      <header className="page-header">
        <h1>Hola, {employee.name}</h1>
        <p className="muted">Bienvenido al portal del empleado.</p>
      </header>
      <div className="cards">
        <Link href="/imputar" className="card card-link">
          <h2>Imputar horas</h2>
          <p className="muted">Carga tus horas o las de tu grupo por proyecto.</p>
        </Link>
        <Link href="/perfil" className="card card-link">
          <h2>Mi perfil</h2>
          <p className="muted">Consulta tus datos y cambia tu contraseña.</p>
        </Link>
      </div>
    </>
  );
}
