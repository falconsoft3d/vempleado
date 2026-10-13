import { getLastUrl } from "@/lib/session";
import LoginForm from "./LoginForm";

const REASONS: Record<string, string> = {
  expired: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  unreachable: "No se pudo contactar con Odoo. Vuelve a iniciar sesión.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const defaultUrl = await getLastUrl();

  return (
    <main className="login">
      <div className="login-card">
        <div className="brand">
          <span className="brand-mark">V</span>
          <div>
            <h1>Portal del Empleado</h1>
            <p className="muted">Accede con tu usuario BIM</p>
          </div>
        </div>
        {reason && REASONS[reason] && <p className="alert alert-info">{REASONS[reason]}</p>}
        <LoginForm defaultUrl={defaultUrl} />
      </div>
    </main>
  );
}
