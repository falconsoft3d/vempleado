"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction, type FormState } from "@/app/actions";

export default function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="form">
      <label>
        Contraseña actual
        <input name="current" type="password" autoComplete="current-password" required />
      </label>
      <label>
        Nueva contraseña
        <input name="new" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label>
        Confirmar nueva contraseña
        <input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      {state.error && <p className="alert alert-error">{state.error}</p>}
      {state.success && <p className="alert alert-success">{state.success}</p>}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
