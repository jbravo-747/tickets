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

export const PRIORITY_CODE: Record<Priority, string> = { URGENTE: "P1", ALTA: "P2", MEDIA: "P3", BAJA: "P4" };

/** Severidades según DESIGN.md: contenedor tenue + borde + punto. */
/** Prioridad: fondo neutro y color solo en el punto (los tokens p1..p4 se ajustan en modo oscuro). */
export const PRIORITY_STYLE: Record<Priority, { badge: string; dot: string }> = {
  URGENTE: { badge: "bg-subtle text-ink-2", dot: "bg-p1" },
  ALTA: { badge: "bg-subtle text-ink-2", dot: "bg-p2" },
  MEDIA: { badge: "bg-subtle text-ink-2", dot: "bg-p3" },
  BAJA: { badge: "bg-subtle text-ink-2", dot: "bg-p4" },
};

export const STATUS_LABEL: Record<Status, string> = {
  NUEVO: "Nuevo",
  EN_PROGRESO: "En progreso",
  EN_ESPERA: "En espera",
  RESUELTO: "Resuelto",
  CERRADO: "Cerrado",
};

export const STATUS_STYLE: Record<Status, { badge: string; dot: string }> = {
  NUEVO: { badge: "bg-subtle text-ink-2", dot: "bg-dot-neutral" },
  EN_PROGRESO: { badge: "bg-subtle text-ink-2", dot: "bg-p3" },
  EN_ESPERA: { badge: "bg-subtle text-ink-2", dot: "bg-p2" },
  RESUELTO: { badge: "bg-subtle text-ink-2", dot: "bg-p4" },
  CERRADO: { badge: "bg-subtle text-muted", dot: "bg-dot-muted" },
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

// ── Evidencia (Vercel Blob privado) ───────────────────────
export const MAX_FILES = 10;
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
/** Tipos permitidos. Sin SVG/HTML para evitar contenido ejecutable. */
export const ALLOWED_CONTENT_TYPES = [
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/heic", "image/heif",
  "application/pdf",
  "video/mp4", "video/quicktime", "video/webm",
  "text/plain", "text/csv",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
];
export const ACCEPT_ATTR = ".png,.jpg,.jpeg,.gif,.webp,.heic,.heif,.pdf,.mp4,.mov,.webm,.txt,.csv,.doc,.docx,.xls,.xlsx,.pptx,.zip";
export const UPLOAD_PREFIX = "evidencias/";

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export type UploadedFile = { pathname: string; name: string; size: number; contentType: string };

// ── ID visible del ticket ─────────────────────────────────
/** ID público y estable para seguimiento: folio 12 → "T-00012". */
export function ticketCode(folio: number) {
  return `T-${String(folio).padStart(5, "0")}`;
}

/** Acepta "T-00012", "t00012", "#12", "00012" o "12". */
export function parseTicketCode(input: string): number | null {
  const m = input.trim().match(/^(?:t-?|#)?0*(\d{1,9})$/i);
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ── Tiempo ────────────────────────────────────────────────
const TZ = "America/Mexico_City";

/** Fecha de hoy en CDMX como "YYYY-MM-DD". */
export function todayISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

/** "hace 2 h 15 min", "hace 3 días" */
export function relativeTime(d: Date, now = new Date()) {
  const min = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60000));
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h${min % 60 ? ` ${min % 60} min` : ""}`;
  const days = Math.floor(h / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

export type DueTone = "none" | "ok" | "warn" | "danger" | "done";

/** Estado de la fecha tentativa de entrega respecto a hoy (CDMX). */
export function dueInfo(due: Date | null, status: Status): { tone: DueTone; label: string; days: number | null } {
  if (!due) return { tone: "none", label: "Sin fecha", days: null };
  const days = Math.round((Date.parse(toISODate(due)) - Date.parse(todayISO())) / 86400000);
  if (status === "RESUELTO" || status === "CERRADO") return { tone: "done", label: "Cerrado", days };
  if (days < 0) return { tone: "danger", label: days === -1 ? "Venció ayer" : `Vencido hace ${-days} días`, days };
  if (days === 0) return { tone: "warn", label: "Vence hoy", days };
  if (days === 1) return { tone: "warn", label: "Vence mañana", days };
  if (days <= 3) return { tone: "warn", label: `En ${days} días`, days };
  return { tone: "ok", label: `En ${days} días`, days };
}

/** Vencimiento como texto coloreado, sin caja (se lee como dato, no como etiqueta). */
export const DUE_TONE_STYLE: Record<DueTone, string> = {
  none: "!px-0 text-muted",
  ok: "!px-0 text-muted",
  warn: "!px-0 text-warn",
  danger: "!px-0 font-semibold text-danger",
  done: "!px-0 text-muted",
};

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}

/** Primera línea de la descripción como título del ticket. */
export function ticketTitle(description: string, max = 90) {
  const first = description.split(/\n/)[0].trim();
  return first.length > max ? `${first.slice(0, max - 1)}…` : first;
}

// ── Logos de organización ─────────────────────────────────
export const LOGO_PREFIX = "logos/";
export const LOGO_MAX_SIZE = 2 * 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function logoUrl(org: { id: string; logoPathname: string | null }) {
  return org.logoPathname ? `/api/logos/${org.id}?v=${encodeURIComponent(org.logoPathname.slice(-12))}` : null;
}
