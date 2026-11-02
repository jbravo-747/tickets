"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Administración</h1>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm">Contraseña</label>
          <input id="password" name="password" type="password" required autoFocus className="w-full rounded border border-slate-300 px-3 py-2" />
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={pending} className="w-full rounded bg-slate-800 py-2 text-white disabled:opacity-60">Entrar</button>
      </form>
    </main>
  );
}
