import Link from "next/link";
import type { Prisma, Priority, Status } from "@prisma/client";
import { prisma } from "@/lib/db";
import { OPEN_STATUSES, PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, formatDate } from "@/lib/constants";
import { PriorityBadge, StatusBadge } from "@/components/Badges";

export const dynamic = "force-dynamic";

type SP = Promise<{ org?: string; estado?: string; prioridad?: string; q?: string }>;

export default async function AdminTickets({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const where: Prisma.TicketWhereInput = {};
  if (sp.org) where.organizationId = sp.org;
  if (sp.estado === "abiertos" || !sp.estado) where.status = { in: OPEN_STATUSES };
  else if (STATUSES.includes(sp.estado as Status)) where.status = sp.estado as Status;
  if (PRIORITIES.includes(sp.prioridad as Priority)) where.priority = sp.prioridad as Priority;
  if (sp.q) {
    const n = Number(sp.q.replace("#", ""));
    where.OR = [
      { description: { contains: sp.q, mode: "insensitive" } },
      { requesterName: { contains: sp.q, mode: "insensitive" } },
      { requesterEmail: { contains: sp.q, mode: "insensitive" } },
      ...(Number.isInteger(n) && n > 0 ? [{ folio: n }] : []),
    ];
  }

  const [orgs, tickets] = await Promise.all([
    prisma.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.ticket.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: { organization: { select: { name: true } } },
      take: 300,
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tickets</h1>
      <form className="flex flex-wrap gap-2 text-sm">
        <input name="q" defaultValue={sp.q} placeholder="Buscar folio, texto, solicitante…" className="w-64 rounded border border-slate-300 px-3 py-1.5" />
        <select name="org" defaultValue={sp.org ?? ""} className="rounded border border-slate-300 px-2 py-1.5">
          <option value="">Todas las organizaciones</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select name="estado" defaultValue={sp.estado ?? "abiertos"} className="rounded border border-slate-300 px-2 py-1.5">
          <option value="abiertos">Abiertos</option>
          <option value="todos">Todos</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select name="prioridad" defaultValue={sp.prioridad ?? ""} className="rounded border border-slate-300 px-2 py-1.5">
          <option value="">Cualquier prioridad</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
        </select>
        <button className="rounded bg-slate-800 px-3 py-1.5 text-white">Filtrar</button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Folio</th>
              <th className="px-3 py-2">Solicitud</th>
              <th className="px-3 py-2">Solicitante</th>
              <th className="px-3 py-2">Prioridad</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Entrega</th>
              <th className="px-3 py-2">Recibida</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono">
                  <Link href={`/admin/tickets/${t.id}`} className="text-blue-700 hover:underline">#{t.folio}</Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/tickets/${t.id}`} className="font-medium hover:underline">{t.description}</Link>
                  <div className="text-xs text-slate-500">{t.organization.name} · {t.areaName} · {t.requestType}</div>
                </td>
                <td className="px-3 py-2">
                  {t.requesterName}
                  <div className="text-xs text-slate-500">{t.requesterEmail}</div>
                </td>
                <td className="px-3 py-2"><PriorityBadge priority={t.priority} /></td>
                <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(t.dueDate)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(t.createdAt)}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No hay tickets con estos filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
