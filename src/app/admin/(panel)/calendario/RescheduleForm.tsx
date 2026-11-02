"use client";

import { useActionState } from "react";
import { Icon } from "@/components/Icon";
import { rescheduleTicket } from "../../actions";

export function RescheduleForm({ tickets, defaultId }: { tickets: { id: string; label: string; due: string }[]; defaultId?: string }) {
  const [msg, action, pending] = useActionState(rescheduleTicket, null);
  return (
    <form action={action} className="panel">
      <div className="panel-header"><span className="flex items-center gap-1.5"><Icon name="edit_calendar" size={16} className="text-primary" />Reprogramar fecha tentativa</span></div>
      <div className="space-y-3 p-4">
        <p className="text-[12px] text-steel">Cambia la fecha comprometida. El motivo queda registrado en el historial del ticket.</p>
        <label className="block">
          <span className="label-caps mb-1 block">Ticket</span>
          <select name="ticketId" defaultValue={defaultId ?? ""} required className="input w-full">
            <option value="" disabled>Elige un ticket abierto</option>
            {tickets.map((t) => <option key={t.id} value={t.id}>{t.label}{t.due ? ` · ${t.due}` : ""}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label-caps mb-1 block">Nueva fecha</span>
          <input type="date" name="dueDate" required className="input w-full" />
        </label>
        <label className="block">
          <span className="label-caps mb-1 block">Motivo del ajuste</span>
          <textarea name="reason" rows={2} maxLength={300} placeholder="Ej. Esperando respuesta del proveedor" className="input w-full" />
        </label>
        <button disabled={pending} className="btn btn-primary btn-lg w-full">{pending ? "Guardando…" : "Confirmar reprogramación"}</button>
        {msg && (msg === "ok"
          ? <p role="status" className="flex items-center gap-1 text-[12px] text-[#15803d]"><Icon name="check_circle" size={14} />Fecha actualizada.</p>
          : <p role="alert" className="text-[12px] text-[#b91c1c]">{msg}</p>)}
      </div>
    </form>
  );
}
