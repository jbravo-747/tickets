"use client";

import { useActionState } from "react";
import { Icon } from "@/components/Icon";
import { lookupTicket } from "./actions";

export function LookupForm() {
  const [error, action, pending] = useActionState(lookupTicket, null);
  return (
        <form action={action} className="panel">
          <div className="border-b border-subtle px-5 py-4">
            <h1 className="flex items-center gap-2 text-[18px] font-semibold"><Icon name="search" size={20} className="text-primary-ink" />Seguimiento de solicitud</h1>
            <p className="text-steel">Consulta el avance y responde al equipo de soporte.</p>
          </div>
          <div className="space-y-4 p-5">
            <label className="block">
              <span className="field-label">ID de la solicitud</span>
              <input name="folio" required placeholder="T-00012" autoCapitalize="characters" className="input ticket-id w-full uppercase" />
            </label>
            <label className="block">
              <span className="field-label">Correo con el que la enviaste</span>
              <input name="email" type="email" required autoComplete="email" className="input w-full" />
            </label>
            {error && <p role="alert" className="flex items-center gap-1 text-[12px] text-danger"><Icon name="error" size={14} />{error}</p>}
            <button disabled={pending} className="btn btn-primary btn-lg w-full">{pending ? "Buscando…" : "Buscar"}</button>
          </div>
        </form>
  );
}
