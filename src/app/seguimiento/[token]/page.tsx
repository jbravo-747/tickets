import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, ticketCode } from "@/lib/constants";
import { PublicHeader } from "@/components/PublicHeader";
import { StatusBadge } from "@/components/Badges";
import { AttachmentList, Thread } from "@/components/Thread";
import { ReplyBox } from "./ReplyBox";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Seguimiento de solicitud", robots: { index: false, follow: false } };

const attachmentSelect = { select: { id: true, name: true, contentType: true, size: true } } as const;

export default async function SeguimientoTicket({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await prisma.ticket.findUnique({
    where: { token },
    include: {
      organization: { select: { name: true, themeColor: true } },
      attachments: { where: { messageId: null }, ...attachmentSelect },
      // Nunca se envían notas internas al solicitante
      messages: { where: { internal: false }, orderBy: { createdAt: "asc" }, include: { attachments: attachmentSelect } },
    },
  });
  if (!t) notFound();
  const color = t.organization.themeColor;

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="h-2" style={{ backgroundColor: color }} />
          <div className="space-y-3 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold">Solicitud <span className="font-mono">{ticketCode(t.folio)}</span></h1>
              <StatusBadge status={t.status} />
            </div>
            <dl className="grid gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-2">
              <div>{t.organization.name} · {t.requestType}</div>
              <div>Enviada: {formatDateTime(t.createdAt)}</div>
              <div>Solicitante: {t.requesterName}</div>
              <div>Entrega tentativa: {formatDate(t.dueDate)}</div>
            </dl>
            <div className="rounded-md bg-slate-50 p-4">
              <p className="whitespace-pre-line text-sm">{t.description}</p>
              <AttachmentList files={t.attachments} token={token} />
            </div>
          </div>
        </div>

        <section aria-labelledby="hilo" className="space-y-3">
          <h2 id="hilo" className="text-lg font-semibold">Conversación</h2>
          <Thread messages={t.messages} token={token} />
        </section>

        {t.status === "CERRADO" ? (
          <p className="rounded-md bg-slate-100 p-4 text-center text-sm text-slate-600">Esta solicitud está cerrada. Si el problema continúa, envía una nueva solicitud.</p>
        ) : (
          <ReplyBox token={token} color={color} />
        )}
        <p className="text-center text-xs text-slate-500">Este enlace es personal: cualquiera que lo tenga puede ver y responder esta solicitud.</p>
      </main>
    </>
  );
}
