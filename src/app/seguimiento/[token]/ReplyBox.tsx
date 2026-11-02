"use client";

import { useActionState } from "react";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { Icon } from "@/components/Icon";
import { replyAsRequester, type ReplyState } from "../actions";

export function ReplyBox({ token }: { token: string }) {
  const [state, action, pending] = useActionState(replyAsRequester.bind(null, token), { attempt: 0 } as ReplyState);
  return (
    <form key={state.attempt} action={action} className="panel space-y-3 p-4">
      <label htmlFor="body" className="font-display flex items-center gap-1.5 text-[14px] font-semibold"><Icon name="forum" size={16} className="text-primary-ink" />Responder al equipo</label>
      <textarea id="body" name="body" rows={4} defaultValue={state.ok ? "" : state.body} placeholder="Escribe tu respuesta o agrega más detalles…" className="input min-h-24 w-full resize-y text-[14px]" />
      <EvidenceUploader compact defaultValue={state.ok ? undefined : state.attachments} />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-subtle pt-3">
        <div>
          {state.error && <p role="alert" className="text-[12px] text-danger">{state.error}</p>}
          {state.ok && <p role="status" className="flex items-center gap-1 text-[12px] text-ok"><Icon name="check_circle" size={14} />Mensaje enviado.</p>}
        </div>
        <button disabled={pending} className="btn btn-primary btn-lg">{pending ? "Enviando…" : "Enviar respuesta"}<Icon name="send" size={16} /></button>
      </div>
    </form>
  );
}
