"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { STATUS_LABEL, parseTicketCode } from "@/lib/constants";
import { parseAttachments } from "@/lib/attachments";

export async function lookupTicket(_prev: string | null, fd: FormData): Promise<string | null> {
  const folio = parseTicketCode(String(fd.get("folio") ?? ""));
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!folio || !email) return "Escribe el ID de tu solicitud (ej. T-00012) y tu correo.";
  const t = await prisma.ticket.findFirst({ where: { folio, requesterEmail: email }, select: { token: true } });
  // Mismo mensaje si no existe o si el correo no coincide, para no revelar folios ajenos.
  if (!t) return "No encontramos una solicitud con ese ID y correo.";
  redirect(`/seguimiento/${t.token}`);
}

export type ReplyState = { ok?: boolean; error?: string; attempt: number; body?: string; attachments?: string };

export async function replyAsRequester(token: string, prev: ReplyState, fd: FormData): Promise<ReplyState> {
  const body = String(fd.get("body") ?? "").trim();
  const rawFiles = String(fd.get("attachments") ?? "");
  const fail = (error: string): ReplyState => ({ error, attempt: prev.attempt + 1, body, attachments: rawFiles });
  if (fd.get("uploading")) return fail("Espera a que terminen de subir los archivos.");

  const ticket = await prisma.ticket.findUnique({ where: { token } });
  if (!ticket) return fail("Solicitud no encontrada.");
  if (ticket.status === "CERRADO") return fail("Esta solicitud está cerrada. Si el problema continúa, levanta una nueva.");

  const files = await parseAttachments(rawFiles);
  if (!files.ok) return fail(files.error);
  if (!body && files.files.length === 0) return fail("Escribe un mensaje o adjunta un archivo.");

  const reopen = ticket.status === "EN_ESPERA" || ticket.status === "RESUELTO";
  await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: {
        ticketId: ticket.id,
        authorType: "REQUESTER",
        authorName: ticket.requesterName,
        body: body || "(archivos adjuntos)",
        attachments: { create: files.files.map((f) => ({ ...f, ticketId: ticket.id })) },
      },
    });
    if (reopen) {
      await tx.message.create({
        data: { ticketId: ticket.id, authorType: "SYSTEM", authorName: "Sistema", body: `El solicitante respondió · Estado: ${STATUS_LABEL[ticket.status]} → ${STATUS_LABEL.EN_PROGRESO}` },
      });
    }
    await tx.ticket.update({ where: { id: ticket.id }, data: { awaitingStaff: true, ...(reopen ? { status: "EN_PROGRESO" } : {}) } });
  });

  revalidatePath(`/seguimiento/${token}`);
  revalidatePath(`/admin/tickets/${ticket.id}`);
  revalidatePath("/admin");
  return { ok: true, attempt: prev.attempt + 1 };
}
