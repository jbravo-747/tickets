"use client";

import { useActionState } from "react";
import { PublicHeaderClient } from "@/components/PublicHeaderClient";
import { lookupTicket } from "./actions";

export default function Seguimiento() {
  const [error, action, pending] = useActionState(lookupTicket, null);
  return (
    <>
      <PublicHeaderClient />
      <main className="mx-auto max-w-md px-4 py-10">
        <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-xl font-semibold">Seguimiento de solicitud</h1>
            <p className="text-sm text-slate-500">Consulta el avance y responde al equipo.</p>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">ID de la solicitud</span>
            <input name="folio" required placeholder="Ej. T-00012" autoCapitalize="characters" className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Correo con el que la enviaste</span>
            <input name="email" type="email" required autoComplete="email" className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button disabled={pending} className="w-full rounded-md bg-slate-800 py-2 text-sm font-medium text-white disabled:opacity-60">Buscar</button>
        </form>
      </main>
    </>
  );
}
