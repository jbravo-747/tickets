import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";

export const dynamic = "force-dynamic";

export default async function ElegirOrganizacion() {
  const orgs = await prisma.organization.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  if (orgs.length === 1) redirect(`/solicitud/${orgs[0].slug}`);
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold">Nueva solicitud</h1>
        {orgs.length === 0 ? (
          <p className="text-slate-600">Aún no hay organizaciones dadas de alta.</p>
        ) : (
          <ul className="space-y-2">
            {orgs.map((o) => (
              <li key={o.id}>
                <Link href={`/solicitud/${o.slug}`} className="block rounded-lg border border-l-8 border-slate-200 bg-white p-4 hover:bg-slate-50" style={{ borderLeftColor: o.themeColor }}>
                  {o.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
