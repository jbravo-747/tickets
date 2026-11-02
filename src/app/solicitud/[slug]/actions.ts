"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { OTHER, parseISODate } from "@/lib/constants";
import { parseAttachments } from "@/lib/attachments";

export type FormState = {
  ok?: boolean;
  folio?: number;
  token?: string;
  attempt: number;
  errors: Record<string, string>;
  values: Record<string, string>;
};

const REQUIRED = "Este campo es obligatorio";

export async function submitTicket(orgId: string, prev: FormState, formData: FormData): Promise<FormState> {
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") values[k] = v.trim();
  const fail = (errors: Record<string, string>): FormState => ({ attempt: prev.attempt + 1, values, errors });

  if (values.uploading) return fail({ attachments: "Espera a que terminen de subir los archivos." });

  const org = await prisma.organization.findFirst({
    where: { id: orgId, active: true },
    include: { areas: true, requestTypes: true, fields: true },
  });
  if (!org) return fail({ _form: "La organización no está disponible." });

  const errors: Record<string, string> = {};
  const get = (k: string) => values[k] ?? "";

  if (!get("description")) errors.description = "Cuéntanos qué necesitas o qué problema tienes";
  else if (get("description").length < 10) errors.description = "Agrega un poco más de detalle";

  let requestType = get("type");
  let typeNotListed = false;
  if (!requestType) errors.type = "Elige el tipo de solicitud o indica que no está en la lista";
  else if (requestType === OTHER) {
    typeNotListed = true;
    if (!org.allowOtherType) errors.type = "Elige una opción de la lista";
    else if (!get("typeOther")) errors.typeOther = "Describe brevemente de qué tipo es tu problema";
    else requestType = get("typeOther").slice(0, 120);
  } else if (!org.requestTypes.some((t) => t.name === requestType)) errors.type = "Elige una opción de la lista";

  if (!get("email")) errors.email = REQUIRED;
  else if (!z.string().email().safeParse(get("email")).success) errors.email = "Ingresa un correo válido";
  if (!get("name")) errors.name = REQUIRED;
  if (org.areas.length > 0) {
    if (!get("area")) errors.area = REQUIRED;
    else if (!org.areas.some((a) => a.name === get("area"))) errors.area = "Elige una opción de la lista";
  }

  let dueDate: Date | null = null;
  if (get("dueDate")) {
    dueDate = parseISODate(get("dueDate"));
    if (!dueDate) errors.dueDate = "Fecha no válida";
  }

  const extra: Record<string, string> = {};
  for (const f of org.fields) {
    const v = get(`f_${f.id}`);
    if (!v) {
      if (f.required) errors[`f_${f.id}`] = REQUIRED;
      continue;
    }
    if (f.type === "SELECT" && !f.options.includes(v)) errors[`f_${f.id}`] = "Elige una opción de la lista";
    else if (f.type === "DATE" && !parseISODate(v)) errors[`f_${f.id}`] = "Fecha no válida";
    else if (f.type === "NUMBER" && isNaN(Number(v))) errors[`f_${f.id}`] = "Ingresa un número";
    else extra[f.label] = v;
  }

  const files = await parseAttachments(get("attachments"));
  if (!files.ok) errors.attachments = files.error;

  if (Object.keys(errors).length || !files.ok) return fail(errors);

  const ticket = await prisma.ticket.create({
    data: {
      organizationId: org.id,
      requesterEmail: get("email").toLowerCase(),
      requesterName: get("name"),
      areaName: get("area") || "—",
      requestType,
      typeNotListed,
      description: get("description"),
      dueDate,
      extra,
      attachments: { create: files.files },
    },
  });

  return { ok: true, folio: ticket.folio, token: ticket.token, attempt: prev.attempt + 1, errors: {}, values: {} };
}
