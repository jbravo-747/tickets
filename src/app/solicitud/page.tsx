import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva solicitud" };

export default async function ElegirOrganizacion() {
  const orgs = await prisma.organization.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  if (orgs.length === 1) redirect(`/solicitud/${orgs[0].slug}`);
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-8">
        <h1 className="text-[22px] font-semibold">Nueva solicitud</h1>
        <p className="text-steel">Elige la organización a la que pertenece tu solicitud.</p>
        {orgs.length === 0 ? (
          <p className="panel p-5 text-muted">Aún no hay organizaciones dadas de alta.</p>
        ) : (
          <ul className="space-y-2">
            {orgs.map((o) => (
              <li key={o.id}>
                <Link href={`/solicitud/${o.slug}`} className="panel flex items-center justify-between border-l-[3px] px-4 py-3 hover:border-[#94a3b8]" style={{ borderLeftColor: o.themeColor }}>
                  <span className="font-display font-semibold">{o.name}</span>
                  <Icon name="chevron_right" className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
