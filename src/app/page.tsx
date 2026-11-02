import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { OPEN_STATUSES, PRIORITIES, PRIORITY_LABEL, PRIORITY_STYLE, formatDate, ticketCode } from "@/lib/constants";
import { PublicHeader } from "@/components/PublicHeader";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { Calendar } from "@/components/Calendar";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

type SP = Promise<{ org?: string; mes?: string }>;

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const { org, mes } = await searchParams;
  const month = mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes)
    ? mes
    : new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }).slice(0, 7);

  const orgs = await prisma.organization.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { slug: true, name: true } });
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

  return (
    <>
      <PublicHeader />
      <AutoRefresh seconds={60} />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Tablero de solicitudes</h1>
            <p className="text-sm text-slate-600">Pila de trabajo pendiente ordenada por prioridad. Se actualiza cada minuto.</p>
          </div>
          {orgs.length > 1 && (
            <nav aria-label="Filtrar por organización" className="flex flex-wrap gap-1 text-sm">
              <Link href={href({ org: undefined })} className={`rounded-full border px-3 py-1 ${!org ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white"}`}>Todas</Link>
              {orgs.map((o) => (
                <Link key={o.slug} href={href({ org: o.slug })} className={`rounded-full border px-3 py-1 ${org === o.slug ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white"}`}>{o.name}</Link>
              ))}
            </nav>
          )}
        </div>

        <section aria-label="Resumen por prioridad" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PRIORITIES.map((p) => (
            <div key={p} className={`rounded-lg border border-l-4 border-slate-200 bg-white p-4 ${PRIORITY_STYLE[p].border}`}>
              <div className="text-sm text-slate-600">{PRIORITY_LABEL[p]}</div>
              <div className="text-3xl font-semibold">{countBy[p] ?? 0}</div>
            </div>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-5">
          <section aria-labelledby="queue-title" className="lg:col-span-3">
            <h2 id="queue-title" className="mb-2 text-lg font-semibold">Pila de solicitudes ({queue.length})</h2>
            {queue.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">No hay solicitudes pendientes.</p>
            ) : (
              <ol className="space-y-2">
                {queue.map((t, i) => (
                  <li key={t.id} className={`rounded-lg border border-l-4 border-slate-200 bg-white p-3 ${PRIORITY_STYLE[t.priority].border}`}>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="text-slate-400">{i + 1}.</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs font-semibold text-white">{ticketCode(t.folio)}</span>
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                      <span>{t.requestType}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 font-medium">{t.description}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-500">
                      {!org && <span>{t.organization.name}</span>}
                      <span>Área: {t.areaName}</span>
                      <span>Recibida: {formatDate(t.createdAt)}</span>
                      <span>Entrega tentativa: {formatDate(t.dueDate)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <div className="lg:col-span-2">
            <Calendar month={month} items={calendarItems.filter((c): c is typeof c & { dueDate: Date } => !!c.dueDate)} hrefFor={(mm) => href({ mes: mm })} />
          </div>
        </div>
      </main>
    </>
  );
}
