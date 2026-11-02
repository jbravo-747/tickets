"use server";

import { timingSafeEqual, createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FieldType, Priority, Status } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SESSION_COOKIE, sessionToken } from "@/lib/session";
import { LOGO_PREFIX, LOGO_TYPES, PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, formatDate, parseISODate, toISODate } from "@/lib/constants";
import { parseAttachments } from "@/lib/attachments";
import { del, head } from "@vercel/blob";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ── Sesión ────────────────────────────────────────────────
export async function login(_prev: string | null, fd: FormData): Promise<string | null> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return "Falta ADMIN_PASSWORD en el servidor.";
  const h = (s: string) => createHash("sha256").update(s).digest();
  if (!timingSafeEqual(h(str(fd, "password")), h(expected))) return "Contraseña incorrecta.";
  // `secure` solo si la petición llegó por HTTPS (Vercel siempre); si no, el navegador descarta la cookie en http://IP-local.
  const proto = (await headers()).get("x-forwarded-proto")?.split(",")[0] ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  (await cookies()).set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// ── Organizaciones ────────────────────────────────────────
function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const orgSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones"),
  intro: z.string(),
  note: z.string(),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color no válido"),
});

function readOrg(fd: FormData) {
  const name = str(fd, "name");
  return orgSchema.safeParse({
    name,
    slug: str(fd, "slug") || slugify(name),
    intro: str(fd, "intro"),
    note: str(fd, "note"),
    themeColor: str(fd, "themeColor") || "#5f7593",
  });
}

async function slugTaken(slug: string, exceptId?: string) {
  const o = await prisma.organization.findUnique({ where: { slug } });
  return !!o && o.id !== exceptId;
}

export async function createOrganization(_prev: string | null, fd: FormData): Promise<string | null> {
  await requireAdmin();
  const parsed = readOrg(fd);
  if (!parsed.success) return parsed.error.issues[0].message;
  if (await slugTaken(parsed.data.slug)) return "Ya existe una organización con ese identificador.";
  const org = await prisma.organization.create({ data: parsed.data });
  revalidatePath("/admin/organizaciones");
  redirect(`/admin/organizaciones/${org.id}`);
}

export async function updateOrganization(id: string, _prev: string | null, fd: FormData): Promise<string | null> {
  await requireAdmin();
  if (fd.get("uploading")) return "Espera a que termine de subir el logo.";
  const parsed = readOrg(fd);
  if (!parsed.success) return parsed.error.issues[0].message;
  if (await slugTaken(parsed.data.slug, id)) return "Ya existe una organización con ese identificador.";
  // Logo: nuevo (pathname subido a Blob), quitar, o sin cambio
  const current = await prisma.organization.findUnique({ where: { id }, select: { logoPathname: true } });
  let logoPathname: string | null | undefined;
  const newLogo = str(fd, "logo");
  if (newLogo && newLogo !== current?.logoPathname) {
    if (!newLogo.startsWith(LOGO_PREFIX) || newLogo.includes("..")) return "Logo no válido.";
    try {
      const meta = await head(newLogo);
      if (!LOGO_TYPES.includes(meta.contentType)) return "El logo debe ser PNG, JPG o WebP.";
    } catch {
      return "No se encontró el logo; vuelve a subirlo.";
    }
    logoPathname = newLogo;
  } else if (fd.get("removeLogo") === "on") {
    logoPathname = null;
  }
  await prisma.organization.update({
    where: { id },
    data: {
      ...parsed.data,
      active: fd.get("active") === "on",
      allowOtherType: fd.get("allowOtherType") === "on",
      ...(logoPathname !== undefined ? { logoPathname } : {}),
    },
  });
  if (logoPathname !== undefined && current?.logoPathname) {
    await del(current.logoPathname).catch(() => {});
  }
  revalidatePath(`/admin/organizaciones/${id}`);
  return "Guardado.";
}

// ── Catálogos: áreas y tipos de solicitud ─────────────────
export async function addCatalogItem(kind: "area" | "type", orgId: string, fd: FormData) {
  await requireAdmin();
  const name = str(fd, "name");
  if (!name) return;
  const where = { organizationId_name: { organizationId: orgId, name } };
  if (kind === "area") {
    const max = await prisma.area.aggregate({ where: { organizationId: orgId }, _max: { order: true } });
    await prisma.area.upsert({ where, update: {}, create: { organizationId: orgId, name, order: (max._max.order ?? -1) + 1 } });
  } else {
    const max = await prisma.requestType.aggregate({ where: { organizationId: orgId }, _max: { order: true } });
    await prisma.requestType.upsert({ where, update: {}, create: { organizationId: orgId, name, order: (max._max.order ?? -1) + 1 } });
  }
  revalidatePath(`/admin/organizaciones/${orgId}`);
}

export async function deleteCatalogItem(kind: "area" | "type", id: string, orgId: string) {
  await requireAdmin();
  if (kind === "area") await prisma.area.deleteMany({ where: { id, organizationId: orgId } });
  else await prisma.requestType.deleteMany({ where: { id, organizationId: orgId } });
  revalidatePath(`/admin/organizaciones/${orgId}`);
}

// ── Campos adicionales del ticket ─────────────────────────
const FIELD_TYPES: FieldType[] = ["TEXT", "TEXTAREA", "SELECT", "DATE", "NUMBER"];

export async function addField(orgId: string, fd: FormData) {
  await requireAdmin();
  const label = str(fd, "label");
  const type = str(fd, "type") as FieldType;
  if (!label || !FIELD_TYPES.includes(type)) return;
  const options = type === "SELECT" ? str(fd, "options").split("\n").map((o) => o.trim()).filter(Boolean) : [];
  if (type === "SELECT" && options.length === 0) return;
  const max = await prisma.ticketField.aggregate({ where: { organizationId: orgId }, _max: { order: true } });
  await prisma.ticketField.create({
    data: { organizationId: orgId, label, type, options, required: fd.get("required") === "on", order: (max._max.order ?? -1) + 1 },
  });
  revalidatePath(`/admin/organizaciones/${orgId}`);
}

export async function toggleFieldRequired(id: string, orgId: string) {
  await requireAdmin();
  const f = await prisma.ticketField.findFirst({ where: { id, organizationId: orgId } });
  if (f) await prisma.ticketField.update({ where: { id }, data: { required: !f.required } });
  revalidatePath(`/admin/organizaciones/${orgId}`);
}

export async function moveField(id: string, orgId: string, dir: -1 | 1) {
  await requireAdmin();
  const fields = await prisma.ticketField.findMany({ where: { organizationId: orgId }, orderBy: { order: "asc" } });
  const i = fields.findIndex((f) => f.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= fields.length) return;
  [fields[i], fields[j]] = [fields[j], fields[i]];
  await prisma.$transaction(fields.map((f, order) => prisma.ticketField.update({ where: { id: f.id }, data: { order } })));
  revalidatePath(`/admin/organizaciones/${orgId}`);
}

export async function deleteField(id: string, orgId: string) {
  await requireAdmin();
  await prisma.ticketField.deleteMany({ where: { id, organizationId: orgId } });
  revalidatePath(`/admin/organizaciones/${orgId}`);
}

// ── Tickets ───────────────────────────────────────────────
const NAME_COOKIE = "admin_name";

async function staffName(fd?: FormData) {
  const fromForm = fd ? str(fd, "authorName") : "";
  const jar = await cookies();
  if (fromForm) {
    jar.set(NAME_COOKIE, fromForm, { httpOnly: true, sameSite: "lax", path: "/admin", maxAge: 60 * 60 * 24 * 365 });
    return fromForm;
  }
  return jar.get(NAME_COOKIE)?.value || "Equipo de soporte";
}

function revalidateTicket(id: string, token?: string) {
  revalidatePath(`/admin/tickets/${id}`);
  revalidatePath("/admin");
  revalidatePath("/");
  if (token) revalidatePath(`/seguimiento/${token}`);
}

/** Aplica cambios y deja un evento SYSTEM por cada campo que cambió. */
async function applyTicketChanges(id: string, changes: { status?: Status; priority?: Priority; dueDate?: Date | null }, by: string, reason?: string) {
  const t = await prisma.ticket.findUnique({ where: { id } });
  if (!t) return null;
  const events: string[] = [];
  if (changes.status && changes.status !== t.status) events.push(`Estado: ${STATUS_LABEL[t.status]} → ${STATUS_LABEL[changes.status]}`);
  if (changes.priority && changes.priority !== t.priority) events.push(`Prioridad: ${PRIORITY_LABEL[t.priority]} → ${PRIORITY_LABEL[changes.priority]}`);
  if (changes.dueDate !== undefined && toISODate(changes.dueDate) !== toISODate(t.dueDate)) {
    events.push(`Fecha de entrega: ${changes.dueDate ? formatDate(changes.dueDate) : "sin fecha"}`);
  }
  if (events.length === 0) return t;
  const closing = (s?: Status) => s === "RESUELTO" || s === "CERRADO";
  const resolvedAt =
    changes.status === undefined ? undefined
    : closing(changes.status) ? (closing(t.status) ? t.resolvedAt ?? new Date() : new Date())
    : null;
  await prisma.$transaction([
    prisma.ticket.update({ where: { id }, data: { ...changes, ...(resolvedAt !== undefined ? { resolvedAt } : {}) } }),
    ...events.map((body, i) =>
      prisma.message.create({
        data: { ticketId: id, authorType: "SYSTEM", authorName: by, body: `${body} (${by})${reason && i === events.length - 1 ? ` · Motivo: ${reason}` : ""}` },
      }),
    ),
  ]);
  return t;
}

export async function updateTicket(id: string, fd: FormData) {
  await requireAdmin();
  const priority = str(fd, "priority") as Priority;
  const status = str(fd, "status") as Status;
  const due = str(fd, "dueDate");
  if (!PRIORITIES.includes(priority) || !STATUSES.includes(status)) return;
  const t = await applyTicketChanges(id, { priority, status, dueDate: due ? parseISODate(due) : null }, await staffName());
  if (t) revalidateTicket(id, t.token);
}

/** Cambio rápido de estado (lista de tickets y botones del detalle). */
export async function setStatus(id: string, fd: FormData) {
  await requireAdmin();
  const status = str(fd, "status") as Status;
  if (!STATUSES.includes(status)) return;
  const t = await applyTicketChanges(id, { status }, await staffName());
  if (t) revalidateTicket(id, t.token);
}

export type StaffReplyState = { ok?: boolean; error?: string; attempt: number; body?: string; attachments?: string };

export async function replyAsStaff(ticketId: string, prev: StaffReplyState, fd: FormData): Promise<StaffReplyState> {
  await requireAdmin();
  const body = str(fd, "body");
  const rawFiles = str(fd, "attachments");
  const fail = (error: string): StaffReplyState => ({ error, attempt: prev.attempt + 1, body, attachments: rawFiles });
  if (fd.get("uploading")) return fail("Espera a que terminen de subir los archivos.");

  const internal = str(fd, "visibility") === "internal";
  const newStatus = str(fd, "status") as Status | "";
  if (newStatus && !STATUSES.includes(newStatus)) return fail("Estado no válido.");

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return fail("Ticket no encontrado.");
  const files = await parseAttachments(rawFiles);
  if (!files.ok) return fail(files.error);
  if (!body && files.files.length === 0 && !newStatus) return fail("Escribe un mensaje.");

  const by = await staffName(fd);
  if (body || files.files.length) {
    await prisma.message.create({
      data: {
        ticketId,
        authorType: "STAFF",
        authorName: by,
        internal,
        body: body || "(archivos adjuntos)",
        attachments: { create: files.files.map((f) => ({ ...f, ticketId })) },
      },
    });
    // Una respuesta visible para el solicitante significa que ya no espera al equipo.
    if (!internal) await prisma.ticket.update({ where: { id: ticketId }, data: { awaitingStaff: false } });
  }
  if (newStatus) await applyTicketChanges(ticketId, { status: newStatus }, by);

  revalidateTicket(ticketId, ticket.token);
  return { ok: true, attempt: prev.attempt + 1 };
}

export async function markAnswered(id: string) {
  await requireAdmin();
  const t = await prisma.ticket.update({ where: { id }, data: { awaitingStaff: false } });
  revalidateTicket(id, t.token);
}

/** Reprogramar fecha tentativa con motivo (calendario). */
export async function rescheduleTicket(_prev: string | null, fd: FormData): Promise<string | null> {
  await requireAdmin();
  const id = str(fd, "ticketId");
  const due = parseISODate(str(fd, "dueDate"));
  const reason = str(fd, "reason").slice(0, 300);
  if (!id) return "Elige un ticket.";
  if (!due) return "Elige una fecha válida.";
  const t = await applyTicketChanges(id, { dueDate: due }, await staffName(), reason || undefined);
  if (!t) return "Ticket no encontrado.";
  revalidateTicket(id, t.token);
  revalidatePath("/admin/calendario");
  return "ok";
}
