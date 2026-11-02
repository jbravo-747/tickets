import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, STATUS_STYLE, formatDate, formatDateTime, ticketCode, toISODate } from "@/lib/constants";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { AttachmentList, Thread } from "@/components/Thread";
import { markAnswered, setStatus, updateTicket } from "../../../actions";
import { StaffComposer } from "./StaffComposer";

export const dynamic = "force-dynamic";

const attachmentSelect = { select: { id: true, name: true, contentType: true, size: true } } as const;

export default async function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await prisma.ticket.findUnique({
    where: { id },
    include: {
      organization: true,
      attachments: { where: { messageId: null }, ...attachmentSelect },
      messages: { orderBy: { createdAt: "asc" }, include: { attachments: attachmentSelect } },
    },
  });
  if (!t) notFound();
  const extra = Object.entries((t.extra ?? {}) as Record<string, string>);
  const defaultName = (await cookies()).get("admin_name")?.value ?? "";
  const open = t.status !== "RESUELTO" && t.status !== "CERRADO";

  return (
    <div className="space-y-5">
      <Link href="/admin" className="text-sm text-slate-600 hover:underline">← Tickets</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold">{ticketCode(t.folio)}</h1>
            <PriorityBadge priority={t.priority} />
            <StatusBadge status={t.status} />
            {t.awaitingStaff && open && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">Pendiente de respuesta</span>}
          </div>
          <p className="text-sm text-slate-500">{t.organization.name} · {t.requestType}{t.typeNotListed && " (no listado)"} · {formatDateTime(t.createdAt)}</p>
        </div>
        <Link href={`/seguimiento/${t.token}`} target="_blank" className="text-sm text-blue-700 hover:underline">Ver como solicitante ↗</Link>
      </div>

      {/* Cambio rápido de estado */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">Estado:</span>
        {STATUSES.map((s) => (
          <form key={s} action={setStatus.bind(null, t.id)}>
            <input type="hidden" name="status" value={s} />
            <button
              disabled={s === t.status}
              className={`rounded-full px-3 py-1 text-xs font-medium ${s === t.status ? `${STATUS_STYLE[s]} ring-2 ring-slate-400` : "border border-slate-300 bg-white hover:bg-slate-50"}`}
            >
              {STATUS_LABEL[s]}
            </button>
          </form>
        ))}
        {t.awaitingStaff && open && (
          <form action={markAnswered.bind(null, t.id)}>
            <button className="text-xs text-slate-500 hover:underline">Marcar como atendido sin responder</button>
          </form>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-5 lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Solicitud original · {t.requesterName}</h2>
            <p className="whitespace-pre-line">{t.description}</p>
            <AttachmentList files={t.attachments} />
          </div>

          <div>
            <h2 className="mb-3 font-semibold">Seguimiento</h2>
            <Thread messages={t.messages} />
          </div>

          <StaffComposer ticketId={t.id} currentStatus={t.status} defaultName={defaultName} />
        </section>

        <aside className="space-y-5">
          <form action={updateTicket.bind(null, t.id)} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-sm">
            <h2 className="font-semibold">Gestionar</h2>
            <label className="block">
              <span className="mb-1 block text-slate-600">Prioridad</span>
              <select name="priority" defaultValue={t.priority} className="w-full rounded border border-slate-300 px-2 py-1.5">
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-600">Estado</span>
              <select name="status" defaultValue={t.status} className="w-full rounded border border-slate-300 px-2 py-1.5">
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-600">Fecha de entrega</span>
              <input type="date" name="dueDate" defaultValue={toISODate(t.dueDate)} className="w-full rounded border border-slate-300 px-2 py-1.5" />
            </label>
            <button className="w-full rounded bg-slate-800 py-2 text-white">Guardar cambios</button>
          </form>

          <dl className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm">
            <h2 className="font-semibold">Datos</h2>
            <Item k="Solicitante" v={t.requesterName} />
            <Item k="Correo" v={<a className="break-all text-blue-700 hover:underline" href={`mailto:${t.requesterEmail}?subject=${encodeURIComponent(`Solicitud ${ticketCode(t.folio)}`)}`}>{t.requesterEmail}</a>} />
            <Item k="Área" v={t.areaName} />
            <Item k="Tipo de solicitud" v={<>{t.requestType}{t.typeNotListed && <span className="ml-1 rounded bg-violet-100 px-1.5 text-xs text-violet-800">no listado</span>}</>} />
            <Item k="Entrega tentativa" v={formatDate(t.dueDate)} />
            {extra.map(([k, v]) => <Item key={k} k={k} v={v} />)}
            <Item k="Última actualización" v={formatDateTime(t.updatedAt)} />
          </dl>
        </aside>
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
