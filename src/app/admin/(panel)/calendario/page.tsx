import Link from "next/link";
import type { Prisma, Priority } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  OPEN_STATUSES, PRIORITIES, PRIORITY_CODE, PRIORITY_LABEL, PRIORITY_STYLE,
  formatDate, ticketCode, ticketTitle, todayISO,
} from "@/lib/constants";
import { Calendar } from "@/components/Calendar";
import { Breadcrumb, PageTitle } from "@/components/PageHeader";
import { DueBadge, PriorityBadge, TicketId } from "@/components/Badges";
import { Icon } from "@/components/Icon";
import { RescheduleForm } from "./RescheduleForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendario y entregas" };

type SP = Promise<{ mes?: string; prioridad?: string; org?: string; ticket?: string }>;

export default async function CalendarioAdmin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const today = todayISO();
  const month = sp.mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.mes) ? sp.mes : today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const prio = PRIORITIES.includes(sp.prioridad as Priority) ? (sp.prioridad as Priority) : undefined;
  const base: Prisma.TicketWhereInput = sp.org ? { organizationId: sp.org } : {};
  const todayDate = new Date(`${today}T00:00:00Z`);

  const [orgs, monthItems, atRisk, openList, closedWithDue] = await Promise.all([
    prisma.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.ticket.findMany({
      where: { ...base, dueDate: { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) } },
      select: { id: true, folio: true, description: true, dueDate: true, priority: true, status: true },
    }),
    // En riesgo: abiertos que vencen hoy o ya vencieron
    prisma.ticket.findMany({
      where: { ...base, status: { in: OPEN_STATUSES }, dueDate: { lte: todayDate } },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      include: { organization: { select: { name: true } } },
      take: 20,
    }),
    prisma.ticket.findMany({
      where: { ...base, status: { in: OPEN_STATUSES } },
      orderBy: [{ priority: "desc" }, { folio: "asc" }],
      select: { id: true, folio: true, description: true, dueDate: true },
      take: 300,
    }),
    prisma.ticket.findMany({
      where: { ...base, resolvedAt: { not: null }, dueDate: { not: null } },
      select: { resolvedAt: true, dueDate: true },
      take: 2000,
      orderBy: { resolvedAt: "desc" },
    }),
  ]);

  const counts = Object.fromEntries(PRIORITIES.map((p) => [p, monthItems.filter((i) => i.priority === p).length])) as Record<Priority, number>;
  const items = monthItems.filter((i): i is typeof i & { dueDate: Date } => !!i.dueDate && (!prio || i.priority === prio));
  const dueToday = atRisk.filter((t) => t.dueDate && t.dueDate.getTime() === todayDate.getTime());
  const overdue = atRisk.filter((t) => t.dueDate && t.dueDate.getTime() < todayDate.getTime());
  // Cumplimiento: resueltos a más tardar el día de entrega (fin del día en CDMX)
  const onTime = closedWithDue.filter((t) => t.resolvedAt!.getTime() <= Date.parse(`${t.dueDate!.toISOString().slice(0, 10)}T23:59:59-06:00`)).length;
  const compliance = closedWithDue.length ? Math.round((onTime / closedWithDue.length) * 1000) / 10 : null;

  const href = (patch: Partial<Record<"mes" | "prioridad" | "org", string | undefined>>) => {
    const p = new URLSearchParams();
    const merged = { mes: sp.mes, prioridad: sp.prioridad, org: sp.org, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/calendario?${s}` : "/admin/calendario";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb items={[{ label: "Operaciones" }, { label: "Calendario y entregas", icon: "calendar_month" }]} />
        <div className="flex flex-wrap gap-2">
          {overdue.length > 0 && <span className="badge border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"><span className="badge-dot bg-[#dc2626]" />{overdue.length} vencido{overdue.length === 1 ? "" : "s"}</span>}
          <span className="badge border-[#bfdbfe] bg-[#eff6ff] text-primary-hover"><span className="badge-dot bg-primary" />{monthItems.length} entregas en el mes</span>
        </div>
      </div>
      <PageTitle title="Calendario de entregas" subtitle="Fechas tentativas de entrega comprometidas con los solicitantes." />

      {/* Barra de filtros */}
      <div className="panel flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="label-caps flex items-center gap-1 text-muted"><Icon name="filter_alt" size={14} />Prioridad</span>
        <div className="flex flex-wrap gap-1.5">
          <Link href={href({ prioridad: undefined })} className={`btn h-8 ${!prio ? "border-primary bg-[#eff6ff] text-primary-hover" : "btn-secondary"}`}>
            Todas <span className="tnum font-mono text-[11px]">({monthItems.length})</span>
          </Link>
          {PRIORITIES.map((p) => (
            <Link key={p} href={href({ prioridad: p })} className={`btn h-8 ${prio === p ? `${PRIORITY_STYLE[p].badge} font-semibold` : "btn-secondary"}`}>
              <span className={`badge-dot ${PRIORITY_STYLE[p].dot}`} />{PRIORITY_CODE[p]} {PRIORITY_LABEL[p]} <span className="tnum font-mono text-[11px]">({counts[p]})</span>
            </Link>
          ))}
        </div>
        {orgs.length > 1 && (
          <form className="flex items-center gap-1.5" action="/admin/calendario">
            {sp.mes && <input type="hidden" name="mes" value={sp.mes} />}
            {sp.prioridad && <input type="hidden" name="prioridad" value={sp.prioridad} />}
            <Icon name="domain" size={16} className="text-muted" />
            <select name="org" defaultValue={sp.org ?? ""} aria-label="Organización" className="input">
              <option value="">Todas las organizaciones</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <button className="btn btn-secondary">Aplicar</button>
          </form>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[13px] text-steel" title="Tickets resueltos a más tardar en su fecha tentativa">
          <Icon name="trending_up" size={16} className="text-primary" />Cumplimiento:
          <strong className="font-display tnum text-ink">{compliance === null ? "—" : `${compliance}%`}</strong>
          {compliance !== null && <span className="text-[11px] text-muted">({onTime}/{closedWithDue.length})</span>}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Calendar month={month} items={items} hrefFor={(mm) => href({ mes: mm })} ticketHref={(id) => `/admin/tickets/${id}`} />
        </div>

        <aside className="flex flex-col gap-5 xl:col-span-4">
          {overdue.length > 0 && (
            <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded bg-[#dc2626] text-white"><Icon name="warning" size={16} /></span>
                <span className="label-caps !text-[#991b1b]">Tickets vencidos</span>
                <span className="counter ml-auto !bg-[#fecaca] !text-[#991b1b]">{overdue.length}</span>
              </div>
              <ul className="space-y-2">
                {overdue.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <Link href={`/admin/tickets/${t.id}`} className="block rounded border border-[#fecaca] bg-white p-2.5 hover:border-[#f87171]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="ticket-id text-[12px] text-[#b91c1c]">{ticketCode(t.folio)}</span>
                        <DueBadge due={t.dueDate} status={t.status} />
                      </div>
                      <p className="font-display mt-1 truncate text-[13px] font-medium">{ticketTitle(t.description)}</p>
                      <div className="mt-0.5 flex justify-between text-[11px] text-muted"><span>{t.organization.name}</span><span>{PRIORITY_CODE[t.priority]} {PRIORITY_LABEL[t.priority]}</span></div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="panel">
            <div className="panel-header">
              <span className="flex items-center gap-1.5"><Icon name="alarm" size={16} className="text-primary" />Compromisos de hoy · {formatDate(todayDate, { day: "numeric", month: "short" })}</span>
              <span className="counter">{dueToday.length}</span>
            </div>
            {dueToday.length === 0 ? (
              <p className="p-4 text-muted">No hay entregas comprometidas para hoy.</p>
            ) : (
              <ul className="space-y-2 p-3">
                {dueToday.map((t) => (
                  <li key={t.id}>
                    <Link href={`/admin/tickets/${t.id}`} className={`block rounded border border-l-2 border-line bg-white p-2.5 hover:border-[#94a3b8] ${PRIORITY_STYLE[t.priority].border}`}>
                      <div className="flex items-center justify-between gap-2"><TicketId folio={t.folio} /><PriorityBadge priority={t.priority} short /></div>
                      <p className="font-display mt-1 truncate text-[13px] font-medium">{ticketTitle(t.description)}</p>
                      <div className="mt-0.5 text-[11px] text-muted">{t.organization.name} · {t.areaName}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <RescheduleForm
            defaultId={sp.ticket}
            tickets={openList.map((t) => ({ id: t.id, label: `${ticketCode(t.folio)} · ${ticketTitle(t.description, 40)}`, due: t.dueDate ? formatDate(t.dueDate) : "" }))}
          />
        </aside>
      </div>
    </div>
  );
}
