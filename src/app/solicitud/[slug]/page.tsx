import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { TicketForm } from "./TicketForm";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

async function getOrg(slug: string) {
  return prisma.organization.findFirst({
    where: { slug, active: true },
    include: {
      areas: { orderBy: [{ order: "asc" }, { name: "asc" }] },
      requestTypes: { orderBy: [{ order: "asc" }, { name: "asc" }] },
      fields: { orderBy: [{ order: "asc" }] },
    },
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const org = await getOrg((await params).slug);
  return { title: org ? `Solicitud · ${org.name}` : "Solicitud" };
}

export default async function SolicitudPage({ params }: { params: Params }) {
  const org = await getOrg((await params).slug);
  if (!org) notFound();
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <TicketForm
          org={{ id: org.id, name: org.name, intro: org.intro, note: org.note, themeColor: org.themeColor, allowOtherType: org.allowOtherType }}
          areas={org.areas.map((a) => a.name)}
          types={org.requestTypes.map((t) => t.name)}
          fields={org.fields.map(({ id, label, type, options, required }) => ({ id, label, type, options, required }))}
        />
        <p className="mt-6 text-center text-xs text-slate-500">Nunca envíes contraseñas a través de este formulario.</p>
      </main>
    </>
  );
}
