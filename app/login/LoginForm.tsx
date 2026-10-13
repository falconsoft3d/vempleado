"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "@/app/actions";

export default function LoginForm({ defaultUrl }: { defaultUrl: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});

  return (
    <form action={action} className="form">
      <label>
        URL de Odoo
        <input name="url" type="text" inputMode="url" placeholder="https://empresa.odoo.com" defaultValue={defaultUrl} required />
      </label>
      <label>
        Usuario
        <input name="login" type="text" autoComplete="username" autoCapitalize="none" required />
      </label>
      <label>
        Contraseña
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error && <p className="alert alert-error">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
