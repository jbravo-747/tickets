import Link from "next/link";
import { prisma } from "@/lib/db";
import { createOrganization } from "../../actions";
import { OrgForm } from "./OrgForm";

export const dynamic = "force-dynamic";

export default async function Organizaciones() {
  const orgs = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tickets: true } } },
  });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h1 className="mb-3 text-2xl font-semibold">Organizaciones</h1>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {orgs.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: o.themeColor }} aria-hidden />
                <div>
                  <Link href={`/admin/organizaciones/${o.id}`} className="font-medium hover:underline">{o.name}</Link>
                  <div className="text-xs text-slate-500">
                    /solicitud/{o.slug} · {o._count.tickets} tickets {!o.active && "· inactiva"}
                  </div>
                </div>
              </div>
              <Link href={`/admin/organizaciones/${o.id}`} className="text-sm text-blue-700 hover:underline">Configurar</Link>
            </li>
          ))}
          {orgs.length === 0 && <li className="p-6 text-center text-slate-500">Aún no hay organizaciones.</li>}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Dar de alta organización</h2>
        <OrgForm action={createOrganization} submitLabel="Crear organización" />
      </section>
    </div>
  );
}
