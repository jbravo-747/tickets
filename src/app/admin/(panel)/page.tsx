import Link from "next/link";
import type { Prisma, Priority, Status } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  OPEN_STATUSES, PRIORITIES, PRIORITY_CODE, PRIORITY_LABEL, PRIORITY_STYLE, STATUSES, STATUS_LABEL,
  formatDate, parseTicketCode, relativeTime, ticketTitle, todayISO,
} from "@/lib/constants";
import { DueBadge, PriorityBadge, TicketId } from "@/components/Badges";
import { StatusSelect } from "@/components/StatusSelect";
import { Breadcrumb, Kpi, PageTitle } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { setStatus } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pila de tickets" };

type SP = Promise<{ org?: string; estado?: string; prioridad?: string; q?: string }>;

export default async function AdminTickets({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const estado = sp.estado ?? "abiertos";
  const where: Prisma.TicketWhereInput = {};
  if (sp.org) where.organizationId = sp.org;
  if (estado === "abiertos") where.status = { in: OPEN_STATUSES };
  else if (estado === "pendientes") Object.assign(where, { status: { in: OPEN_STATUSES }, awaitingStaff: true });
  else if (estado === "vencidos") Object.assign(where, { status: { in: OPEN_STATUSES }, dueDate: { lt: new Date(`${todayISO()}T00:00:00Z`) } });
  else if (STATUSES.includes(estado as Status)) where.status = estado as Status;
  if (PRIORITIES.includes(sp.prioridad as Priority)) where.priority = sp.prioridad as Priority;
  if (sp.q) {
    const n = parseTicketCode(sp.q);
    where.OR = [
      { description: { contains: sp.q, mode: "insensitive" } },
      { requesterName: { contains: sp.q, mode: "insensitive" } },
      { requesterEmail: { contains: sp.q, mode: "insensitive" } },
      ...(n ? [{ folio: n }] : []),
    ];
  }

  const openWhere: Prisma.TicketWhereInput = { status: { in: OPEN_STATUSES }, ...(sp.org ? { organizationId: sp.org } : {}) };
  const [orgs, tickets, byPriority, pending, overdue] = await Promise.all([
    prisma.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.ticket.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: { organization: { select: { name: true } }, _count: { select: { attachments: true } } },
      take: 300,
    }),
    prisma.ticket.groupBy({ by: ["priority"], where: openWhere, _count: true }),
    prisma.ticket.count({ where: { ...openWhere, awaitingStaff: true } }),
    prisma.ticket.count({ where: { ...openWhere, dueDate: { lt: new Date(`${todayISO()}T00:00:00Z`) } } }),
  ]);
  const countBy = Object.fromEntries(byPriority.map((c) => [c.priority, c._count])) as Partial<Record<Priority, number>>;
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { org: sp.org, estado: sp.estado, prioridad: sp.prioridad, q: sp.q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };
  const tones = { URGENTE: "p1", ALTA: "p2", MEDIA: "p3", BAJA: "p4" } as const;

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: "Operaciones" }, { label: "Pila de tickets", icon: "inbox" }]} />
      <PageTitle
        title="Pila de tickets"
        subtitle="Solicitudes ordenadas por severidad y antigüedad."
        actions={<Link href="/admin/calendario" className="btn btn-secondary"><Icon name="calendar_month" size={16} />Calendario</Link>}
      />

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {PRIORITIES.map((p) => (
          <Kpi key={p} label={`${PRIORITY_CODE[p]} · ${PRIORITY_LABEL[p]}`} value={countBy[p] ?? 0} tone={tones[p]} href={qs({ prioridad: p, estado: "abiertos" })} />
        ))}
        <Kpi label="Sin respuesta" icon="pending_actions" value={pending} tone={pending ? "p3" : "default"} href={qs({ estado: "pendientes", prioridad: undefined })} />
        <Kpi label="Vencidos" icon="warning" value={overdue} tone={overdue ? "warn" : "default"} href={qs({ estado: "vencidos", prioridad: undefined })} />
      </section>

      <div className="panel overflow-hidden">
        <form className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <span className="label-caps flex items-center gap-1 text-muted"><Icon name="filter_alt" size={14} />Filtros</span>
          <div className="flex h-8 items-center gap-1.5 rounded border border-line-strong bg-white px-2 focus-within:border-primary focus-within:shadow-[0_0_0_1px_#1d4ed8]">
            <Icon name="search" size={14} className="text-muted" />
            <input name="q" defaultValue={sp.q} placeholder="ID, texto o solicitante" aria-label="Buscar" className="h-full w-52 bg-transparent outline-none" />
          </div>
          <select name="org" defaultValue={sp.org ?? ""} aria-label="Organización" className="input">
            <option value="">Todas las organizaciones</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <select name="estado" defaultValue={estado} aria-label="Estado" className="input">
            <option value="abiertos">Abiertos</option>
            <option value="pendientes">Pendientes de respuesta</option>
            <option value="vencidos">Vencidos</option>
            <option value="todos">Todos</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select name="prioridad" defaultValue={sp.prioridad ?? ""} aria-label="Prioridad" className="input">
            <option value="">Cualquier prioridad</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_CODE[p]} · {PRIORITY_LABEL[p]}</option>)}
          </select>
          <button className="btn btn-primary">Aplicar</button>
          {(sp.q || sp.org || sp.prioridad || (sp.estado && sp.estado !== "abiertos")) && <Link href="/admin" className="btn btn-ghost">Limpiar</Link>}
          <span className="tnum ml-auto text-[12px] text-muted">{tickets.length} resultado{tickets.length === 1 ? "" : "s"}</span>
        </form>

        {/* Móvil: tarjetas */}
        <ul className="divide-y divide-[#f1f5f9] md:hidden">
          {tickets.map((t) => (
            <li key={t.id} className={`border-l-2 px-4 py-3 ${PRIORITY_STYLE[t.priority].border}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <Link href={`/admin/tickets/${t.id}`}><TicketId folio={t.folio} className="!text-primary" /></Link>
                <PriorityBadge priority={t.priority} short />
                <StatusSelect status={t.status} action={setStatus.bind(null, t.id)} />
                <DueBadge due={t.dueDate} status={t.status} />
              </div>
              <Link href={`/admin/tickets/${t.id}`} className="font-display mt-1.5 line-clamp-2 block text-[14px] font-medium hover:text-primary">{ticketTitle(t.description, 160)}</Link>
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[12px] text-muted">
                <span>{t.requesterName}</span><span>· {t.areaName}</span><span className="tnum">· {relativeTime(t.createdAt)}</span>
                {t.awaitingStaff && OPEN_STATUSES.includes(t.status) && <span className="badge border-[#bfdbfe] bg-[#eff6ff] text-primary-hover">Sin respuesta</span>}
              </div>
            </li>
          ))}
          {tickets.length === 0 && <li className="p-8 text-center text-muted">No hay tickets con estos filtros.</li>}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th className="w-24">ID</th>
                <th>Solicitud</th>
                <th className="w-44">Solicitante</th>
                <th className="w-28">Prioridad</th>
                <th className="w-32">Estado</th>
                <th className="w-36">Entrega</th>
                <th className="w-28">Recibida</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className={`border-l-2 ${PRIORITY_STYLE[t.priority].border}`}>
                  <td><Link href={`/admin/tickets/${t.id}`} className="hover:underline"><TicketId folio={t.folio} className="!text-primary" /></Link></td>
                  <td className="max-w-0">
                    <Link href={`/admin/tickets/${t.id}`} className="font-display block truncate font-medium hover:text-primary hover:underline">{ticketTitle(t.description, 140)}</Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                      <span className="truncate">{t.organization.name} · {t.areaName} · {t.requestType}</span>
                      {t.typeNotListed && <span className="badge border-[#ddd6fe] bg-[#f5f3ff] text-[#5b21b6]">No listado</span>}
                      {t.awaitingStaff && OPEN_STATUSES.includes(t.status) && <span className="badge border-[#bfdbfe] bg-[#eff6ff] text-primary-hover"><Icon name="forum" size={12} />Sin respuesta</span>}
                      {t._count.attachments > 0 && <span className="tnum flex items-center gap-0.5"><Icon name="attach_file" size={13} />{t._count.attachments}</span>}
                    </div>
                  </td>
                  <td>
                    <div className="truncate">{t.requesterName}</div>
                    <div className="truncate text-[12px] text-muted">{t.requesterEmail}</div>
                  </td>
                  <td><PriorityBadge priority={t.priority} short /></td>
                  <td><StatusSelect status={t.status} action={setStatus.bind(null, t.id)} /></td>
                  <td>
                    <div className="tnum">{formatDate(t.dueDate)}</div>
                    <DueBadge due={t.dueDate} status={t.status} />
                  </td>
                  <td className="tnum text-[12px] text-steel" title={formatDate(t.createdAt)}>{relativeTime(t.createdAt)}</td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr><td colSpan={7} className="!h-28 text-center text-muted">No hay tickets con estos filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
