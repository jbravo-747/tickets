import Link from "next/link";
import type { Prisma, Priority, Status } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  OPEN_STATUSES, PRIORITIES, PRIORITY_CODE, PRIORITY_LABEL, STATUSES, STATUS_LABEL,
  formatDate, logoUrl, parseTicketCode, relativeTime, ticketTitle, todayISO,
} from "@/lib/constants";
import { DueBadge, PriorityBadge, TicketId } from "@/components/Badges";
import { StatusSelect } from "@/components/StatusSelect";
import { Breadcrumb, Kpi, PageTitle } from "@/components/PageHeader";
import { AccentScope } from "@/components/Accent";
import { Icon } from "@/components/Icon";
import { setStatus } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pila de tickets" };

type SP = Promise<{ org?: string; estado?: string; prioridad?: string; q?: string }>;

type Org = { id: string; name: string; slug: string; themeColor: string; logoPathname: string | null; active: boolean };
type Row = Prisma.TicketGetPayload<{ include: { _count: { select: { attachments: true } } } }>;

export default async function AdminTickets({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const estado = sp.estado ?? "abiertos";
  const today = new Date(`${todayISO()}T00:00:00Z`);

  // Filtros comunes (sin organización): sirven para la lista y para el conteo de cada pestaña
  const base: Prisma.TicketWhereInput = {};
  if (estado === "abiertos") base.status = { in: OPEN_STATUSES };
  else if (estado === "pendientes") Object.assign(base, { status: { in: OPEN_STATUSES }, awaitingStaff: true });
  else if (estado === "vencidos") Object.assign(base, { status: { in: OPEN_STATUSES }, dueDate: { lt: today } });
  else if (STATUSES.includes(estado as Status)) base.status = estado as Status;
  if (PRIORITIES.includes(sp.prioridad as Priority)) base.priority = sp.prioridad as Priority;
  if (sp.q) {
    const n = parseTicketCode(sp.q);
    base.OR = [
      { description: { contains: sp.q, mode: "insensitive" } },
      { requesterName: { contains: sp.q, mode: "insensitive" } },
      { requesterEmail: { contains: sp.q, mode: "insensitive" } },
      ...(n ? [{ folio: n }] : []),
    ];
  }
  const where: Prisma.TicketWhereInput = { ...base, ...(sp.org ? { organizationId: sp.org } : {}) };
  const openWhere: Prisma.TicketWhereInput = { status: { in: OPEN_STATUSES }, ...(sp.org ? { organizationId: sp.org } : {}) };

  const [orgs, tickets, perOrg, byPriority, pending, overdue] = await Promise.all([
    prisma.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, themeColor: true, logoPathname: true, active: true } }),
    prisma.ticket.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: { _count: { select: { attachments: true } } },
      take: 500,
    }),
    prisma.ticket.groupBy({ by: ["organizationId"], where: base, _count: true }),
    prisma.ticket.groupBy({ by: ["priority"], where: openWhere, _count: true }),
    prisma.ticket.count({ where: { ...openWhere, awaitingStaff: true } }),
    prisma.ticket.count({ where: { ...openWhere, dueDate: { lt: today } } }),
  ]);

  const countBy = Object.fromEntries(byPriority.map((c) => [c.priority, c._count])) as Partial<Record<Priority, number>>;
  const orgCount = Object.fromEntries(perOrg.map((c) => [c.organizationId, c._count])) as Record<string, number>;
  const total = perOrg.reduce((a, c) => a + c._count, 0);
  const byOrg = new Map<string, Row[]>();
  for (const t of tickets) byOrg.set(t.organizationId, [...(byOrg.get(t.organizationId) ?? []), t]);
  const selected = orgs.find((o) => o.id === sp.org);
  // Secciones: la organización elegida, o todas las que tienen tickets con los filtros actuales
  const sections = selected ? [selected] : orgs.filter((o) => byOrg.has(o.id));

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { org: sp.org, estado: sp.estado, prioridad: sp.prioridad, q: sp.q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };
  const tones = { URGENTE: "p1", ALTA: "p2", MEDIA: "p3", BAJA: "p4" } as const;
  const filtered = !!(sp.q || sp.prioridad || (sp.estado && sp.estado !== "abiertos"));

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb items={[{ label: "Operaciones" }, { label: "Pila de tickets", icon: "inbox" }]} />
      <PageTitle
        title="Pila de tickets"
        subtitle="Solicitudes por organización, ordenadas por severidad y antigüedad."
        actions={<Link href="/admin/calendario" className="btn btn-secondary"><Icon name="calendar_month" size={16} />Calendario</Link>}
      />

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {PRIORITIES.map((p) => (
          <Kpi key={p} label={`${PRIORITY_CODE[p]} · ${PRIORITY_LABEL[p]}`} value={countBy[p] ?? 0} tone={tones[p]} href={qs({ prioridad: p, estado: "abiertos" })} />
        ))}
        <Kpi label="Sin respuesta" icon="pending_actions" value={pending} tone={pending ? "p3" : "default"} href={qs({ estado: "pendientes", prioridad: undefined })} />
        <Kpi label="Vencidos" icon="warning" value={overdue} tone={overdue ? "warn" : "default"} href={qs({ estado: "vencidos", prioridad: undefined })} />
      </section>

      {/* Pestañas por organización */}
      <nav aria-label="Organizaciones" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        <OrgTab href={qs({ org: undefined })} active={!sp.org} label="Todas" count={total} />
        {orgs.map((o) => (
          <OrgTab key={o.id} href={qs({ org: o.id })} active={sp.org === o.id} label={o.name} count={orgCount[o.id] ?? 0} org={o} />
        ))}
      </nav>

      {/* Filtros */}
      <form className="panel flex flex-wrap items-center gap-2 px-4 py-3">
        {sp.org && <input type="hidden" name="org" value={sp.org} />}
        <span className="label-caps flex items-center gap-1"><Icon name="filter_alt" size={14} />Filtros</span>
        <div className="input-wrap w-60">
          <Icon name="search" size={16} />
          <input name="q" defaultValue={sp.q} placeholder="ID, texto o solicitante" aria-label="Buscar" />
        </div>
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
        {filtered && <Link href={qs({ q: undefined, prioridad: undefined, estado: undefined })} className="btn btn-ghost">Limpiar</Link>}
        <span className="tnum ml-auto text-[12px] text-muted">{tickets.length} resultado{tickets.length === 1 ? "" : "s"}</span>
      </form>

      {sections.length === 0 ? (
        <div className="panel flex flex-col items-center gap-2 px-6 py-12 text-center text-muted">
          <Icon name="task_alt" size={28} />
          <p>{orgs.length === 0 ? "Aún no hay organizaciones dadas de alta." : "No hay tickets con estos filtros."}</p>
        </div>
      ) : (
        sections.map((o) => <OrgSection key={o.id} org={o} rows={byOrg.get(o.id) ?? []} />)
      )}
    </div>
  );
}

function OrgMark({ org, size = 20 }: { org: Org; size?: number }) {
  const url = logoUrl(org);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- logo servido por /api/logos
    <img src={url} alt="" className="flex-none object-contain" style={{ height: size, maxWidth: size * 3 }} />
  ) : (
    <span className="flex-none rounded-full" style={{ width: size * 0.45, height: size * 0.45, backgroundColor: org.themeColor }} aria-hidden />
  );
}

function OrgTab({ href, active, label, count, org }: { href: string; active: boolean; label: string; count: number; org?: Org }) {
  return (
    <Link
      href={href} aria-current={active ? "page" : undefined}
      className={`flex h-10 flex-none items-center gap-2 rounded-xl border px-3 text-[13px] font-medium transition-colors ${active ? "border-line bg-white text-ink shadow-[0_1px_3px_rgb(28_25_23/.06)]" : "border-transparent text-steel hover:bg-subtle hover:text-ink"}`}
    >
      {org && <OrgMark org={org} size={18} />}
      <span className="max-w-48 truncate">{label}</span>
      <span className="counter">{count}</span>
    </Link>
  );
}

function OrgSection({ org, rows }: { org: Org; rows: Row[] }) {
  return (
    <AccentScope color={org.themeColor}>
      <section aria-label={org.name} className="panel overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <OrgMark org={org} size={24} />
            <h2 className="truncate text-[16px] font-medium">{org.name}</h2>
            <span className="counter">{rows.length}</span>
            {!org.active && <span className="badge bg-subtle text-muted">Inactiva</span>}
          </div>
          <div className="flex items-center gap-1">
            <Link href={`/solicitud/${org.slug}`} target="_blank" className="btn btn-ghost h-8"><Icon name="open_in_new" size={15} />Formulario</Link>
            <Link href={`/admin/organizaciones/${org.id}`} className="btn btn-ghost h-8"><Icon name="domain" size={15} />Configurar</Link>
          </div>
        </header>

        {rows.length === 0 ? (
          <p className="flex items-center justify-center gap-2 px-6 py-10 text-muted"><Icon name="task_alt" size={18} />Sin tickets con estos filtros.</p>
        ) : (
          <>
            {/* Móvil: tarjetas */}
            <ul className="divide-y divide-subtle md:hidden">
              {rows.map((t) => (
                <li key={t.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link href={`/admin/tickets/${t.id}`}><TicketId folio={t.folio} /></Link>
                    <PriorityBadge priority={t.priority} short />
                    <StatusSelect status={t.status} action={setStatus.bind(null, t.id)} />
                    <DueBadge due={t.dueDate} status={t.status} />
                  </div>
                  <Link href={`/admin/tickets/${t.id}`} className="font-display mt-1.5 line-clamp-2 block text-[14px] font-medium hover:text-primary-ink">{ticketTitle(t.description, 160)}</Link>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[12px] text-muted">
                    <span>{t.requesterName}</span><span>· {t.areaName}</span><span className="tnum">· {relativeTime(t.createdAt)}</span>
                    {t.awaitingStaff && OPEN_STATUSES.includes(t.status) && <span className="font-medium text-primary-ink">· Sin respuesta</span>}
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="data-table min-w-[900px]">
                <thead>
                  <tr>
                    <th className="w-24">ID</th>
                    <th>Solicitud</th>
                    <th className="w-44">Solicitante</th>
                    <th className="w-24">Prioridad</th>
                    <th className="w-36">Estado</th>
                    <th className="w-36">Entrega</th>
                    <th className="w-28">Recibida</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id}>
                      <td><Link href={`/admin/tickets/${t.id}`} className="hover:underline"><TicketId folio={t.folio} /></Link></td>
                      <td className="max-w-0">
                        <Link href={`/admin/tickets/${t.id}`} className="font-display block truncate font-medium hover:text-primary-ink hover:underline">{ticketTitle(t.description, 140)}</Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                          <span className="truncate">{t.areaName} · {t.requestType}</span>
                          {t.typeNotListed && <span>· No listado</span>}
                          {t.awaitingStaff && OPEN_STATUSES.includes(t.status) && <span className="flex items-center gap-1 font-medium text-primary-ink"><Icon name="forum" size={13} />Sin respuesta</span>}
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
                      <td className="tnum whitespace-nowrap text-[12px] text-steel" title={formatDate(t.createdAt)}>{relativeTime(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </AccentScope>
  );
}
