"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { OTHER, parseISODate } from "@/lib/constants";

export type FormState = {
  ok?: boolean;
  folio?: number;
  attempt: number;
  errors: Record<string, string>;
  values: Record<string, string>;
};

const REQUIRED = "Esta pregunta es obligatoria";


export async function submitTicket(orgId: string, prev: FormState, formData: FormData): Promise<FormState> {
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") values[k] = v.trim();

  const org = await prisma.organization.findFirst({
    where: { id: orgId, active: true },
    include: { areas: true, requestTypes: true, fields: true },
  });
  if (!org) return { attempt: prev.attempt + 1, values, errors: { _form: "La organización no está disponible." } };

  const errors: Record<string, string> = {};
  const get = (k: string) => values[k] ?? "";

  if (!get("email")) errors.email = REQUIRED;
  else if (!z.string().email().safeParse(get("email")).success) errors.email = "Ingresa un correo válido";
  if (!get("name")) errors.name = REQUIRED;
  if (!get("area")) errors.area = REQUIRED;
  else if (!org.areas.some((a) => a.name === get("area"))) errors.area = "Elige una opción de la lista";

  let requestType = get("type");
  if (!requestType) errors.type = REQUIRED;
  else if (requestType === OTHER) {
    if (!org.allowOtherType) errors.type = "Elige una opción de la lista";
    else if (!get("typeOther")) errors.type = "Especifica el tipo de solicitud";
    else requestType = get("typeOther");
  } else if (!org.requestTypes.some((t) => t.name === requestType)) errors.type = "Elige una opción de la lista";

  if (!get("description")) errors.description = REQUIRED;

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

  if (Object.keys(errors).length) return { attempt: prev.attempt + 1, values, errors };

  const ticket = await prisma.ticket.create({
    data: {
      organizationId: org.id,
      requesterEmail: get("email").toLowerCase(),
      requesterName: get("name"),
      areaName: get("area"),
      requestType,
      description: get("description"),
      dueDate,
      extra,
    },
  });

  return { ok: true, folio: ticket.folio, attempt: prev.attempt + 1, errors: {}, values: {} };
}
