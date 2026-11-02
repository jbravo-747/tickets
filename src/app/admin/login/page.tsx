"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={action} className="panel elevated w-full max-w-sm">
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          <span className="font-display flex h-7 w-7 items-center justify-center rounded bg-primary text-[14px] font-bold text-on-primary">M</span>
          <div>
            <h1 className="text-[16px] font-semibold leading-5">Mesa de ayuda</h1>
            <p className="text-[12px] text-muted">Acceso de administración</p>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="field-label">Contraseña</span>
            <input id="password" name="password" type="password" required autoFocus aria-invalid={!!error} className="input w-full" />
          </label>
          {error && <p role="alert" className="text-[12px] text-danger">{error}</p>}
          <button disabled={pending} className="btn btn-primary btn-lg w-full">{pending ? "Entrando…" : "Entrar"}</button>
        </div>
      </form>
    </main>
  );
}
