import type { FieldType, Priority, Status } from "@prisma/client";

export const PRIORITIES: Priority[] = ["URGENTE", "ALTA", "MEDIA", "BAJA"];
export const STATUSES: Status[] = ["NUEVO", "EN_PROGRESO", "EN_ESPERA", "RESUELTO", "CERRADO"];
export const OPEN_STATUSES: Status[] = ["NUEVO", "EN_PROGRESO", "EN_ESPERA"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  URGENTE: "Urgente",
  ALTA: "Alta",
  MEDIA: "Media",
  BAJA: "Baja",
};

/** Clases Tailwind por prioridad: badge, punto y borde */
export const PRIORITY_STYLE: Record<Priority, { badge: string; dot: string; border: string }> = {
  URGENTE: { badge: "bg-red-100 text-red-800", dot: "bg-red-600", border: "border-l-red-600" },
  ALTA: { badge: "bg-orange-100 text-orange-800", dot: "bg-orange-500", border: "border-l-orange-500" },
  MEDIA: { badge: "bg-amber-100 text-amber-800", dot: "bg-amber-400", border: "border-l-amber-400" },
  BAJA: { badge: "bg-slate-100 text-slate-700", dot: "bg-slate-400", border: "border-l-slate-400" },
};

export const STATUS_LABEL: Record<Status, string> = {
  NUEVO: "Nuevo",
  EN_PROGRESO: "En progreso",
  EN_ESPERA: "En espera",
  RESUELTO: "Resuelto",
  CERRADO: "Cerrado",
};

export const STATUS_STYLE: Record<Status, string> = {
  NUEVO: "bg-sky-100 text-sky-800",
  EN_PROGRESO: "bg-indigo-100 text-indigo-800",
  EN_ESPERA: "bg-yellow-100 text-yellow-800",
  RESUELTO: "bg-emerald-100 text-emerald-800",
  CERRADO: "bg-slate-200 text-slate-700",
};

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  TEXT: "Respuesta corta",
  TEXTAREA: "Párrafo",
  SELECT: "Lista desplegable",
  DATE: "Fecha",
  NUMBER: "Número",
};

/** Las fechas @db.Date se guardan a medianoche UTC: se formatean en UTC para no correr el día. */
export function formatDate(d: Date | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", { ...opts, timeZone: "UTC" }).format(d);
}

export function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(d);
}

/** "2026-11-15" -> Date UTC, o null si no es una fecha válida */
export function parseISODate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}

export function toISODate(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}

/** Valor del radio "Otro" en tipo de solicitud */
export const OTHER = "__otro";
