import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, formatDate, formatDateTime, toISODate } from "@/lib/constants";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { addComment, updateTicket } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await prisma.ticket.findUnique({
    where: { id },
    include: { organization: true, comments: { orderBy: { createdAt: "asc" } } },
  });
  if (!t) notFound();
  const extra = Object.entries((t.extra ?? {}) as Record<string, string>);

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-slate-600 hover:underline">← Tickets</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">#{t.folio} · {t.description}</h1>
        <PriorityBadge priority={t.priority} />
        <StatusBadge status={t.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm sm:grid-cols-2">
            <Item k="Organización" v={t.organization.name} />
            <Item k="Recibida" v={formatDateTime(t.createdAt)} />
            <Item k="Solicitante" v={t.requesterName} />
            <Item k="Correo" v={<a className="text-blue-700 hover:underline" href={`mailto:${t.requesterEmail}`}>{t.requesterEmail}</a>} />
            <Item k="Área" v={t.areaName} />
            <Item k="Tipo de solicitud" v={t.requestType} />
            <Item k="Fecha tentativa de entrega" v={formatDate(t.dueDate)} />
            <Item k="Última actualización" v={formatDateTime(t.updatedAt)} />
            {extra.map(([k, v]) => <Item key={k} k={k} v={v} />)}
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">Descripción</dt>
              <dd className="whitespace-pre-line">{t.description}</dd>
            </div>
          </dl>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold">Notas internas</h2>
            <ul className="mb-4 space-y-3">
              {t.comments.map((c) => (
                <li key={c.id} className="rounded bg-slate-50 p-3 text-sm">
                  <div className="mb-1 text-xs text-slate-500">{c.author} · {formatDateTime(c.createdAt)}</div>
                  <p className="whitespace-pre-line">{c.body}</p>
                </li>
              ))}
              {t.comments.length === 0 && <li className="text-sm text-slate-500">Sin notas.</li>}
            </ul>
            <form action={addComment.bind(null, t.id)} className="space-y-2">
              <input name="author" placeholder="Tu nombre" className="w-48 rounded border border-slate-300 px-3 py-1.5 text-sm" />
              <textarea name="body" required rows={3} placeholder="Agregar nota (solo visible para el equipo)" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              <button className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white">Agregar nota</button>
            </form>
          </div>
        </section>

        <aside>
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
