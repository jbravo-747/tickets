import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { AccentScope } from "@/components/Accent";
import { toBrand } from "@/lib/brand";
import { TicketForm } from "./TicketForm";
import { Icon } from "@/components/Icon";

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
    <AccentScope color={org.themeColor}>
      <PublicHeader brand={toBrand(org)} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <TicketForm
          org={{ id: org.id, name: org.name, intro: org.intro, note: org.note, allowOtherType: org.allowOtherType, logoUrl: toBrand(org).logoUrl }}
          areas={org.areas.map((a) => a.name)}
          types={org.requestTypes.map((t) => t.name)}
          fields={org.fields.map(({ id, label, type, options, required }) => ({ id, label, type, options, required }))}
        />
        <p className="mt-4 flex items-center justify-center gap-1 text-[12px] text-muted"><Icon name="lock" size={14} />Nunca envíes contraseñas a través de este formulario.</p>
      </main>
    </AccentScope>
  );
}
