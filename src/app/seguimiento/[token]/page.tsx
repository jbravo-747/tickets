import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { dueInfo, formatDate, formatDateTime, relativeTime, ticketCode } from "@/lib/constants";
import { PublicHeader } from "@/components/PublicHeader";
import { AccentScope } from "@/components/Accent";
import { toBrand } from "@/lib/brand";
import { DueBadge, PriorityBadge, StatusBadge } from "@/components/Badges";
import { AttachmentList, Thread } from "@/components/Thread";
import { Icon } from "@/components/Icon";
import { ReplyBox } from "./ReplyBox";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Seguimiento de solicitud", robots: { index: false, follow: false } };

const attachmentSelect = { select: { id: true, name: true, contentType: true, size: true } } as const;

export default async function SeguimientoTicket({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await prisma.ticket.findUnique({
    where: { token },
    include: {
      organization: { select: { id: true, name: true, themeColor: true, logoPathname: true } },
      attachments: { where: { messageId: null }, ...attachmentSelect },
      // Nunca se envían notas internas al solicitante
      messages: { where: { internal: false }, orderBy: { createdAt: "asc" }, include: { attachments: attachmentSelect } },
    },
  });
  if (!t) notFound();
  const due = dueInfo(t.dueDate, t.status);

  return (
    <AccentScope color={t.organization.themeColor}>
      <PublicHeader brand={toBrand(t.organization)} />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <section className="panel overflow-hidden">
          <div className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[13px] text-steel"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.organization.themeColor }} aria-hidden />{t.organization.name}</div>
                <h1 className="ticket-id text-[28px] leading-9 text-primary-ink">{ticketCode(t.folio)}</h1>
              </div>
              <div className="flex flex-wrap gap-1.5"><StatusBadge status={t.status} /><PriorityBadge priority={t.priority} /><DueBadge due={t.dueDate} status={t.status} /></div>
            </div>
            <dl className="grid gap-3 border-y border-subtle py-3 sm:grid-cols-4">
              <Meta k="Tipo" v={t.requestType} />
              <Meta k="Área" v={t.areaName} />
              <Meta k="Enviada" v={<span title={formatDateTime(t.createdAt)}>{relativeTime(t.createdAt)}</span>} />
              <Meta k="Entrega tentativa" v={t.dueDate ? <>{formatDate(t.dueDate)}{due.tone === "danger" && <span className="block text-[11px] text-danger">{due.label}</span>}</> : "Por definir"} />
            </dl>
            <div>
              <div className="label-caps mb-1">Tu solicitud</div>
              <p className="whitespace-pre-line text-[15px] leading-[22px] text-ink-2">{t.description}</p>
              <AttachmentList files={t.attachments} token={token} />
            </div>
          </div>
        </section>

        <section aria-labelledby="hilo" className="space-y-3">
          <h2 id="hilo" className="flex items-center gap-2 text-[16px] font-semibold"><Icon name="timeline" size={20} className="text-primary-ink" />Seguimiento <span className="counter">{t.messages.length}</span></h2>
          <Thread messages={t.messages} token={token} />
        </section>

        {t.status === "CERRADO" ? (
          <p className="panel flex items-center justify-center gap-2 p-4 text-steel"><Icon name="lock" size={16} />Esta solicitud está cerrada. Si el problema continúa, envía una nueva.</p>
        ) : (
          <ReplyBox token={token} />
        )}
        <p className="flex items-center justify-center gap-1 text-[12px] text-muted"><Icon name="lock" size={14} />Este enlace es personal: cualquiera que lo tenga puede ver y responder esta solicitud.</p>
      </main>
    </AccentScope>
  );
}

function Meta({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{k}</dt>
      <dd className="font-display font-medium">{v}</dd>
    </div>
  );
}
