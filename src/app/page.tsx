import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { OPEN_STATUSES, PRIORITIES, PRIORITY_CODE, PRIORITY_LABEL, formatDate, relativeTime, ticketTitle, todayISO } from "@/lib/constants";
import { PublicHeader } from "@/components/PublicHeader";
import { DueBadge, PriorityBadge, StatusBadge, TicketId } from "@/components/Badges";
import { Calendar } from "@/components/Calendar";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Kpi } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { AccentScope } from "@/components/Accent";
import { defaultBrand, toBrand } from "@/lib/brand";

export const dynamic = "force-dynamic";

type SP = Promise<{ org?: string; mes?: string }>;

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const { org, mes } = await searchParams;
  const month = mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : todayISO().slice(0, 7);

  const orgs = await prisma.organization.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, slug: true, name: true, themeColor: true, logoPathname: true } });
  const selected = orgs.find((o) => o.slug === org);
  const brand = selected ? toBrand(selected) : await defaultBrand();
  const orgFilter: Prisma.TicketWhereInput = org ? { organization: { slug: org } } : { organization: { active: true } };

  const [y, m] = month.split("-").map(Number);
  // Solo campos públicos: nunca se envían correo ni nombre del solicitante al tablero.
  const [queue, counts, calendarItems] = await Promise.all([
    prisma.ticket.findMany({
      where: { ...orgFilter, status: { in: OPEN_STATUSES } },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      select: {
        id: true, folio: true, description: true, areaName: true, requestType: true, priority: true, status: true,
        dueDate: true, createdAt: true, organization: { select: { name: true } },
      },
      take: 200,
    }),
    prisma.ticket.groupBy({ by: ["priority"], where: { ...orgFilter, status: { in: OPEN_STATUSES } }, _count: true }),
    prisma.ticket.findMany({
      where: { ...orgFilter, dueDate: { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) } },
      select: { id: true, folio: true, description: true, dueDate: true, priority: true, status: true },
    }),
  ]);

  const countBy = Object.fromEntries(counts.map((c) => [c.priority, c._count]));
  const href = (params: { org?: string; mes?: string }) => {
    const q = new URLSearchParams();
    const o = "org" in params ? params.org : org;
    const mm = "mes" in params ? params.mes : mes;
    if (o) q.set("org", o);
    if (mm) q.set("mes", mm);
    const s = q.toString();
    return s ? `/?${s}` : "/";
  };
  const tones = { URGENTE: "p1", ALTA: "p2", MEDIA: "p3", BAJA: "p4" } as const;

  return (
    <AccentScope color={brand?.color}>
      <PublicHeader brand={brand} />
      <AutoRefresh seconds={60} />
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold leading-7 tracking-tight sm:text-[28px] sm:leading-9">Tablero de solicitudes</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-steel"><span className="h-2 w-2 rounded-full bg-p4" />Pila de trabajo pendiente por severidad · se actualiza cada minuto</p>
          </div>
          {orgs.length > 1 && (
            <nav aria-label="Filtrar por organización" className="flex flex-wrap gap-1.5">
              <Link href={href({ org: undefined })} className={`btn h-8 ${!org ? "border-ink bg-ink text-white" : "btn-secondary"}`}>Todas</Link>
              {orgs.map((o) => (
                <Link key={o.slug} href={href({ org: o.slug })} className={`btn h-8 ${org === o.slug ? "border-ink bg-ink text-white" : "btn-secondary"}`}>{o.name}</Link>
              ))}
            </nav>
          )}
        </div>

        <section aria-label="Resumen por prioridad" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PRIORITIES.map((p) => <Kpi key={p} label={`${PRIORITY_CODE[p]} · ${PRIORITY_LABEL[p]}`} value={countBy[p] ?? 0} tone={tones[p]} />)}
        </section>

        <div className="grid gap-6 xl:grid-cols-12">
          <section aria-labelledby="queue-title" className="panel overflow-hidden xl:col-span-6">
            <div className="panel-header">
              <h2 id="queue-title" className="flex items-center gap-1.5 text-[14px]"><Icon name="inbox" size={16} className="text-primary-ink" />Pila de solicitudes</h2>
              <span className="counter">{queue.length}</span>
            </div>
            {queue.length === 0 ? (
              <p className="flex items-center justify-center gap-2 p-10 text-muted"><Icon name="task_alt" size={18} />No hay solicitudes pendientes.</p>
            ) : (
              <ol className="divide-y divide-subtle">
                {queue.map((t, i) => (
                  <li key={t.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="tnum w-6 font-mono text-[11px] text-muted">{i + 1}.</span>
                      <TicketId folio={t.folio} />
                      <PriorityBadge priority={t.priority} short />
                      <StatusBadge status={t.status} />
                      <DueBadge due={t.dueDate} status={t.status} />
                    </div>
                    <p className="font-display mt-1.5 line-clamp-2 text-[14px] font-medium leading-5">{ticketTitle(t.description, 200)}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted">
                      {!org && <span>{t.organization.name}</span>}
                      <span>{t.areaName}</span>
                      <span>{t.requestType}</span>
                      <span className="tnum">Recibida {relativeTime(t.createdAt)}</span>
                      {t.dueDate && <span className="tnum">Entrega {formatDate(t.dueDate)}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <div className="xl:col-span-6">
            <Calendar month={month} items={calendarItems.filter((c): c is typeof c & { dueDate: Date } => !!c.dueDate)} hrefFor={(mm) => href({ mes: mm })} maxPerDay={2} />
          </div>
        </div>
      </main>
    </AccentScope>
  );
}
