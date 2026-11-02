"use client";

import { useActionState, useState } from "react";
import type { Status } from "@prisma/client";
import { STATUSES, STATUS_LABEL } from "@/lib/constants";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { Icon } from "@/components/Icon";
import { replyAsStaff, type StaffReplyState } from "../../../actions";

export function StaffComposer({ ticketId, currentStatus, defaultName }: { ticketId: string; currentStatus: Status; defaultName: string }) {
  const [state, action, pending] = useActionState(replyAsStaff.bind(null, ticketId), { attempt: 0 } as StaffReplyState);
  const [mode, setMode] = useState<"public" | "internal">("public");
  const internal = mode === "internal";

  return (
    <form key={state.attempt} action={action} className={`panel space-y-3 p-4 ${internal ? "!border-[#fde68a] !bg-[#fffbeb]" : ""}`}>
      <input type="hidden" name="visibility" value={mode} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Tipo de mensaje" className="inline-flex gap-0.5 rounded border border-line bg-[#f1f5f9] p-0.5">
          {(["public", "internal"] as const).map((m) => (
            <button
              key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              className={`btn h-7 border-0 px-3 ${mode === m ? (m === "internal" ? "bg-[#d97706] text-white" : "bg-primary text-white") : "bg-transparent text-steel hover:text-ink"}`}
            >
              <Icon name={m === "public" ? "public" : "lock"} size={16} />
              {m === "public" ? "Respuesta al solicitante" : "Nota interna"}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-muted">{internal ? "Solo la verá el equipo." : "El solicitante la verá en su página de seguimiento."}</span>
      </div>
      <textarea
        name="body" rows={5} defaultValue={state.ok ? "" : state.body} aria-label="Mensaje"
        placeholder={internal ? "Escribe una nota para el equipo…" : "Escribe tu respuesta al solicitante…"}
        className="input min-h-28 w-full resize-y text-[14px]"
      />
      <EvidenceUploader compact defaultValue={state.ok ? undefined : state.attachments} />
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-[#f1f5f9] pt-3">
        <div className="flex flex-wrap items-end gap-3">
          <label>
            <span className="field-label">Cambiar estado</span>
            <select name="status" defaultValue="" className="input">
              <option value="">Sin cambio ({STATUS_LABEL[currentStatus]})</option>
              {STATUSES.filter((s) => s !== currentStatus).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </label>
          <label>
            <span className="field-label">Firmar como</span>
            <input name="authorName" defaultValue={defaultName} placeholder="Tu nombre" className="input w-44" />
          </label>
        </div>
        <button disabled={pending} className={`btn btn-lg ${internal ? "border-[#b45309] bg-[#d97706] text-white hover:bg-[#b45309]" : "btn-primary"}`}>
          {pending ? "Guardando…" : internal ? "Guardar nota" : "Enviar respuesta"}
          <Icon name={internal ? "lock" : "send"} size={16} />
        </button>
      </div>
      {state.error && <p role="alert" className="text-[12px] text-[#b91c1c]">{state.error}</p>}
      {state.ok && <p role="status" className="flex items-center gap-1 text-[12px] text-[#15803d]"><Icon name="check_circle" size={14} />Guardado.</p>}
    </form>
  );
}
