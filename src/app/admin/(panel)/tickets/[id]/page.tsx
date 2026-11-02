import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  PRIORITIES, PRIORITY_CODE, PRIORITY_LABEL, STATUSES, STATUS_LABEL, STATUS_STYLE,
  dueInfo, formatDate, formatDateTime, relativeTime, ticketCode, ticketTitle, toISODate,
} from "@/lib/constants";
import { Avatar, PriorityBadge, StatusBadge, TicketId } from "@/components/Badges";
import { AttachmentList, Thread } from "@/components/Thread";
import { Breadcrumb } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { markAnswered, setStatus, updateTicket } from "../../../actions";
import { StaffComposer } from "./StaffComposer";

export const dynamic = "force-dynamic";

const attachmentSelect = { select: { id: true, name: true, contentType: true, size: true } } as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await prisma.ticket.findUnique({ where: { id: (await params).id }, select: { folio: true } });
  return { title: t ? ticketCode(t.folio) : "Ticket" };
}

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
  const others = await prisma.ticket.findMany({
    where: { requesterEmail: t.requesterEmail, id: { not: t.id } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, folio: true, description: true, status: true, createdAt: true },
  });
  const extra = Object.entries((t.extra ?? {}) as Record<string, string>);
  const defaultName = (await cookies()).get("admin_name")?.value ?? "";
  const open = t.status !== "RESUELTO" && t.status !== "CERRADO";
  const due = dueInfo(t.dueDate, t.status);
  const publicCount = t.messages.filter((m) => m.authorType !== "SYSTEM").length;

  // Avance del plazo: desde la creación hasta el final del día de entrega
  let gauge: { pct: number; color: string } | null = null;
  if (t.dueDate && open) {
    const start = t.createdAt.getTime();
    const end = Date.parse(`${toISODate(t.dueDate)}T23:59:59-06:00`);
    const remaining = Math.max(0, Math.min(1, (end - Date.now()) / Math.max(1, end - start)));
    gauge = { pct: Math.round((1 - remaining) * 100), color: remaining > 0.4 ? "#16a34a" : remaining > 0.1 ? "#d97706" : "#dc2626" };
  }

  return (
    <div className="space-y-5">
      {/* Ruta, insignias y acciones rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Breadcrumb items={[{ label: "Tickets", href: "/admin", icon: "folder_open" }, { label: t.requestType }, { label: ticketCode(t.folio) }]} />
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={t.status} />
            <PriorityBadge priority={t.priority} />
            {t.awaitingStaff && open && <span className="badge border-[#bfdbfe] bg-[#eff6ff] text-primary-hover"><Icon name="forum" size={12} />Sin respuesta</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/seguimiento/${t.token}`} target="_blank" className="btn btn-secondary"><Icon name="open_in_new" size={16} />Vista del solicitante</Link>
          {t.awaitingStaff && open && (
            <form action={markAnswered.bind(null, t.id)}><button className="btn btn-secondary"><Icon name="task_alt" size={16} />Marcar atendido</button></form>
          )}
          {open ? (
            <form action={setStatus.bind(null, t.id)}>
              <input type="hidden" name="status" value="RESUELTO" />
              <button className="btn btn-primary"><Icon name="check_circle" size={16} />Marcar como resuelto</button>
            </form>
          ) : (
            <form action={setStatus.bind(null, t.id)}>
              <input type="hidden" name="status" value="EN_PROGRESO" />
              <button className="btn btn-secondary"><Icon name="history" size={16} />Reabrir</button>
            </form>
          )}
        </div>
      </div>

      {/* Encabezado maestro + indicador de plazo */}
      <section className="panel flex flex-col justify-between gap-5 p-5 lg:flex-row lg:items-center">
        <div className="min-w-0 max-w-3xl space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-steel">
            <span className="flex items-center gap-1 rounded-[3px] border border-[#bfdbfe] bg-[#eff6ff] px-1.5 py-0.5 font-semibold text-primary-hover">
              <Icon name="schedule" size={14} />Creado {relativeTime(t.createdAt)}
            </span>
            <span className="text-[#94a3b8]">•</span>
            <span className="flex items-center gap-1"><Icon name="apartment" size={14} className="text-muted" />{t.organization.name}</span>
            <span className="text-[#94a3b8]">•</span>
            <span className="flex items-center gap-1"><Icon name="label" size={14} className="text-muted" />{t.areaName}</span>
          </div>
          <h1 className="text-[20px] font-semibold leading-7 tracking-tight">
            <span className="ticket-id text-primary">{ticketCode(t.folio)}</span>: {ticketTitle(t.description, 110)}
          </h1>
        </div>
        <div className="flex w-full flex-none items-center gap-4 rounded-lg border border-line bg-canvas p-4 lg:w-80">
          <Icon name={due.tone === "danger" ? "warning" : "hourglass_top"} size={28} className={due.tone === "danger" ? "text-[#dc2626]" : due.tone === "warn" ? "text-[#d97706]" : "text-primary"} />
          <div className="min-w-0 flex-1">
            <div className="label-caps">Fecha tentativa de entrega</div>
            <div className="font-display tnum text-[16px] font-semibold">{t.dueDate ? formatDate(t.dueDate, { dateStyle: "full" }) : "Sin fecha asignada"}</div>
            {gauge ? (
              <>
                <div className="mt-1.5 h-1 overflow-hidden rounded-sm bg-line"><div className="h-full" style={{ width: `${gauge.pct}%`, background: gauge.color }} /></div>
                <div className={`mt-1 text-[12px] font-medium ${due.tone === "danger" ? "text-[#b91c1c]" : due.tone === "warn" ? "text-[#b45309]" : "text-[#15803d]"}`}>{due.label}</div>
              </>
            ) : (
              <div className="text-[12px] text-muted">{open ? "Asígnala en Propiedades" : `Cerrado ${t.resolvedAt ? relativeTime(t.resolvedAt) : ""}`}</div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="flex flex-col gap-5 lg:col-span-8">
          {/* Reporte original */}
          <article className="panel">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f1f5f9] px-5 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={t.requesterName} size={36} />
                <div>
                  <div className="font-display text-[14px] font-semibold">{t.requesterName}</div>
                  <div className="text-[12px] text-muted">{t.requesterEmail} · {t.areaName}</div>
                </div>
              </div>
              <time className="tnum flex items-center gap-1 font-mono text-[11px] text-steel" dateTime={t.createdAt.toISOString()}>
                <Icon name="schedule" size={14} className="text-muted" />{formatDateTime(t.createdAt)}
              </time>
            </header>
            <div className="px-5 py-4">
              <p className="whitespace-pre-line text-[15px] leading-[22px] text-ink-2">{t.description}</p>
              <AttachmentList files={t.attachments} />
            </div>
          </article>

          {/* Historial */}
          <div className="flex items-center gap-2">
            <Icon name="timeline" size={20} className="text-primary" />
            <h2 className="text-[16px] font-semibold">Historial de seguimiento</h2>
            <span className="counter">{t.messages.length}</span>
            <span className="text-[12px] text-muted">{publicCount} mensaje{publicCount === 1 ? "" : "s"}</span>
          </div>
          <Thread messages={t.messages} />

          <StaffComposer ticketId={t.id} currentStatus={t.status} defaultName={defaultName} />
        </section>

        {/* Columna de propiedades */}
        <aside className="flex flex-col gap-5 lg:col-span-4">
          <div className="panel">
            <div className="panel-header"><span className="flex items-center gap-1.5"><Icon name="flag" size={16} className="text-primary" />Estado</span></div>
            <div className="grid grid-cols-2 gap-1.5 p-4">
              {STATUSES.map((s) => (
                <form key={s} action={setStatus.bind(null, t.id)}>
                  <input type="hidden" name="status" value={s} />
                  <button
                    disabled={s === t.status} aria-pressed={s === t.status}
                    className={`btn w-full justify-start ${s === t.status ? `${STATUS_STYLE[s].badge} !opacity-100 font-semibold` : "btn-secondary"}`}
                  >
                    <span className={`badge-dot ${STATUS_STYLE[s].dot}`} />{STATUS_LABEL[s]}
                  </button>
                </form>
              ))}
            </div>
          </div>

          <form action={updateTicket.bind(null, t.id)} className="panel">
            <div className="panel-header"><span className="flex items-center gap-1.5"><Icon name="tag" size={16} className="text-primary" />Propiedades del ticket</span></div>
            <div className="space-y-3 p-4">
              <input type="hidden" name="status" value={t.status} />
              <label className="block">
                <span className="field-label">Prioridad</span>
                <select name="priority" defaultValue={t.priority} className="input w-full">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_CODE[p]} · {PRIORITY_LABEL[p]}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="field-label">Fecha tentativa de entrega</span>
                <input type="date" name="dueDate" defaultValue={toISODate(t.dueDate)} className="input w-full" />
              </label>
              <button className="btn btn-secondary w-full">Guardar cambios</button>
            </div>
          </form>

          <dl className="panel divide-y divide-[#f1f5f9]">
            <div className="panel-header !border-b-0"><span className="flex items-center gap-1.5"><Icon name="description" size={16} className="text-primary" />Datos de la solicitud</span></div>
            <Row icon="domain" k="Organización" v={t.organization.name} />
            <Row icon="person" k="Solicitante" v={<>{t.requesterName}<a href={`mailto:${t.requesterEmail}?subject=${encodeURIComponent(`Solicitud ${ticketCode(t.folio)}`)}`} className="block truncate text-[12px] text-primary hover:underline">{t.requesterEmail}</a></>} />
            <Row icon="apartment" k="Área" v={t.areaName} />
            <Row icon="label" k="Tipo" v={<span className="flex flex-wrap items-center gap-1.5">{t.requestType}{t.typeNotListed && <span className="badge border-[#ddd6fe] bg-[#f5f3ff] text-[#5b21b6]">No listado</span>}</span>} />
            {extra.map(([k, v]) => <Row key={k} icon="tag" k={k} v={v} />)}
            <Row icon="history" k="Última actualización" v={<span className="tnum">{formatDateTime(t.updatedAt)}</span>} />
          </dl>

          <div className="panel">
            <div className="panel-header">
              <span className="flex items-center gap-1.5"><Icon name="history" size={16} className="text-primary" />Otros tickets del solicitante</span>
              <span className="counter">{others.length}</span>
            </div>
            {others.length === 0 ? (
              <p className="p-4 text-muted">No hay otras solicitudes de este correo.</p>
            ) : (
              <ul className="space-y-1.5 p-3">
                {others.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/tickets/${o.id}`} className="block rounded border border-line bg-canvas p-2 hover:border-[#94a3b8]">
                      <div className="flex items-center justify-between gap-2"><TicketId folio={o.folio} /><StatusBadge status={o.status} /></div>
                      <p className="mt-1 truncate text-[12px] text-ink-2">{ticketTitle(o.description)}</p>
                      <span className="tnum text-[11px] text-muted">{relativeTime(o.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ icon, k, v }: { icon: Parameters<typeof Icon>[0]["name"]; k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-4 py-2.5">
      <Icon name={icon} size={16} className="mt-0.5 text-muted" />
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] text-muted">{k}</dt>
        <dd className="min-w-0 break-words">{v}</dd>
      </div>
    </div>
  );
}
