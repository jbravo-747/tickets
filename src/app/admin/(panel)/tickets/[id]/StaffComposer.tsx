"use client";

import { useActionState, useState } from "react";
import type { Status } from "@prisma/client";
import { STATUSES, STATUS_LABEL } from "@/lib/constants";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { replyAsStaff, type StaffReplyState } from "../../../actions";

export function StaffComposer({ ticketId, currentStatus, defaultName }: { ticketId: string; currentStatus: Status; defaultName: string }) {
  const [state, action, pending] = useActionState(replyAsStaff.bind(null, ticketId), { attempt: 0 } as StaffReplyState);
  const [mode, setMode] = useState<"public" | "internal">("public");
  const internal = mode === "internal";

  return (
    <form key={state.attempt} action={action} className={`space-y-3 rounded-lg border p-4 ${internal ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <input type="hidden" name="visibility" value={mode} />
      <div role="tablist" className="flex gap-1 text-sm">
        {(["public", "internal"] as const).map((m) => (
          <button
            key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1.5 ${mode === m ? (m === "internal" ? "bg-amber-200 font-medium text-amber-900" : "bg-slate-800 font-medium text-white") : "text-slate-600 hover:bg-slate-100"}`}
          >
            {m === "public" ? "Responder al solicitante" : "Nota interna"}
          </button>
        ))}
      </div>
      <textarea
        name="body" rows={5} defaultValue={state.ok ? "" : state.body} aria-label="Mensaje"
        placeholder={internal ? "Solo la verá el equipo…" : "El solicitante verá esta respuesta en su página de seguimiento…"}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
      />
      <EvidenceUploader compact defaultValue={state.ok ? undefined : state.attachments} />
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="text-slate-600">Estado</span>
            <select name="status" defaultValue="" className="rounded-md border border-slate-300 bg-white px-2 py-1.5">
              <option value="">Sin cambio ({STATUS_LABEL[currentStatus]})</option>
              {STATUSES.filter((s) => s !== currentStatus).map((s) => <option key={s} value={s}>Cambiar a: {STATUS_LABEL[s]}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-slate-600">Firmar como</span>
            <input name="authorName" defaultValue={defaultName} className="w-40 rounded-md border border-slate-300 bg-white px-2 py-1.5" />
          </label>
        </div>
        <button disabled={pending} className={`rounded-md px-5 py-2 font-semibold disabled:opacity-60 ${internal ? "bg-amber-600 text-white" : "bg-slate-800 text-white"}`}>
          {pending ? "Guardando…" : internal ? "Guardar nota" : "Enviar respuesta"}
        </button>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-emerald-700">Guardado.</p>}
    </form>
  );
}
