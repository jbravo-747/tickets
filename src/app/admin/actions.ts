"use server";

import { timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FieldType, Priority, Status } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SESSION_COOKIE, sessionToken } from "@/lib/session";
import { PRIORITIES, STATUSES, parseISODate } from "@/lib/constants";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ── Sesión ────────────────────────────────────────────────
export async function login(_prev: string | null, fd: FormData): Promise<string | null> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return "Falta ADMIN_PASSWORD en el servidor.";
  const h = (s: string) => createHash("sha256").update(s).digest();
  if (!timingSafeEqual(h(str(fd, "password")), h(expected))) return "Contraseña incorrecta.";
  (await cookies()).set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
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
  const parsed = readOrg(fd);
  if (!parsed.success) return parsed.error.issues[0].message;
  if (await slugTaken(parsed.data.slug, id)) return "Ya existe una organización con ese identificador.";
  await prisma.organization.update({
    where: { id },
    data: { ...parsed.data, active: fd.get("active") === "on", allowOtherType: fd.get("allowOtherType") === "on" },
  });
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
export async function updateTicket(id: string, fd: FormData) {
  await requireAdmin();
  const priority = str(fd, "priority") as Priority;
  const status = str(fd, "status") as Status;
  const due = str(fd, "dueDate");
  if (!PRIORITIES.includes(priority) || !STATUSES.includes(status)) return;
  await prisma.ticket.update({
    where: { id },
    data: { priority, status, dueDate: due ? parseISODate(due) : null },
  });
  revalidatePath(`/admin/tickets/${id}`);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function addComment(ticketId: string, fd: FormData) {
  await requireAdmin();
  const body = str(fd, "body");
  if (!body) return;
  await prisma.comment.create({ data: { ticketId, body, author: str(fd, "author") || "Admin" } });
  revalidatePath(`/admin/tickets/${ticketId}`);
}
