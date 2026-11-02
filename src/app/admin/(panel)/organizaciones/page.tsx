import Link from "next/link";
import { prisma } from "@/lib/db";
import { OPEN_STATUSES } from "@/lib/constants";
import { Breadcrumb, PageTitle } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { createOrganization } from "../../actions";
import { OrgForm } from "./OrgForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organizaciones" };

export default async function Organizaciones() {
  const orgs = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tickets: true, areas: true, requestTypes: true } } },
  });
  const open = await prisma.ticket.groupBy({ by: ["organizationId"], where: { status: { in: OPEN_STATUSES } }, _count: true });
  const openBy = Object.fromEntries(open.map((o) => [o.organizationId, o._count]));

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: "Operaciones" }, { label: "Organizaciones", icon: "domain" }]} />
      <PageTitle title="Organizaciones" subtitle="Cada organización tiene su formulario público, catálogos y campos propios." />
      <div className="grid gap-6 xl:grid-cols-12">
        <section className="panel overflow-hidden xl:col-span-7">
          <table className="data-table">
            <thead><tr><th>Organización</th><th className="w-24">Abiertos</th><th className="w-24">Total</th><th className="w-28">Estado</th><th className="w-24" /></tr></thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: o.themeColor }} aria-hidden />
                      <div>
                        <Link href={`/admin/organizaciones/${o.id}`} className="font-display font-semibold hover:text-primary-ink hover:underline">{o.name}</Link>
                        <div className="font-mono text-[11px] text-muted">/solicitud/{o.slug} · {o._count.areas} áreas · {o._count.requestTypes} tipos</div>
                      </div>
                    </div>
                  </td>
                  <td className="tnum font-mono">{openBy[o.id] ?? 0}</td>
                  <td className="tnum font-mono">{o._count.tickets}</td>
                  <td>{o.active ? <span className="badge bg-subtle"><span className="badge-dot bg-p4" />Activa</span> : <span className="badge bg-subtle text-muted"><span className="badge-dot bg-dot-muted" />Inactiva</span>}</td>
                  <td className="text-right"><Link href={`/admin/organizaciones/${o.id}`} className="btn btn-secondary h-7 px-2 text-[12px]">Configurar</Link></td>
                </tr>
              ))}
              {orgs.length === 0 && <tr><td colSpan={5} className="!h-24 text-center text-muted">Aún no hay organizaciones.</td></tr>}
            </tbody>
          </table>
        </section>
        <section className="panel xl:col-span-5">
          <div className="panel-header"><span className="flex items-center gap-1.5"><Icon name="add" size={16} className="text-primary-ink" />Dar de alta organización</span></div>
          <OrgForm action={createOrganization} submitLabel="Crear organización" />
        </section>
      </div>
    </div>
  );
}
