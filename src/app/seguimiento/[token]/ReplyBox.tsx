"use client";

import { useActionState } from "react";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { replyAsRequester, type ReplyState } from "../actions";

export function ReplyBox({ token, color }: { token: string; color: string }) {
  const [state, action, pending] = useActionState(replyAsRequester.bind(null, token), { attempt: 0 } as ReplyState);
  return (
    <form key={state.attempt} action={action} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <label htmlFor="body" className="block text-sm font-medium">Responder al equipo</label>
      <textarea id="body" name="body" rows={4} defaultValue={state.ok ? "" : state.body} placeholder="Escribe tu respuesta o agrega más detalles…" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      <EvidenceUploader compact color={color} defaultValue={state.ok ? undefined : state.attachments} />
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-emerald-700">Mensaje enviado.</p>}
      <div className="text-right">
        <button disabled={pending} className="rounded-md px-5 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: color }}>
          {pending ? "Enviando…" : "Enviar respuesta"}
        </button>
      </div>
    </form>
  );
}
