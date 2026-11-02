import type { Priority, Status } from "@prisma/client";
import {
  DUE_TONE_STYLE, PRIORITY_CODE, PRIORITY_LABEL, PRIORITY_STYLE, STATUS_LABEL, STATUS_STYLE,
  dueInfo, initials, ticketCode,
} from "@/lib/constants";

export function PriorityBadge({ priority, short = false }: { priority: Priority; short?: boolean }) {
  const s = PRIORITY_STYLE[priority];
  return (
    <span className={`badge ${s.badge}`}>
      <span className={`badge-dot ${s.dot}`} aria-hidden />
      {short ? PRIORITY_CODE[priority] : `${PRIORITY_CODE[priority]} · ${PRIORITY_LABEL[priority]}`}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`badge ${s.badge}`}>
      <span className={`badge-dot ${s.dot}`} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function DueBadge({ due, status }: { due: Date | null; status: Status }) {
  const d = dueInfo(due, status);
  if (d.tone === "none" || d.tone === "done") return null;
  return <span className={`badge ${DUE_TONE_STYLE[d.tone]}`}>{d.label}</span>;
}

/** ID visible del ticket: T-00012 */
export function TicketId({ folio, className = "" }: { folio: number; className?: string }) {
  return (
    <span className={`ticket-id inline-flex h-5 items-center rounded-[3px] border border-[#cbd5e1] bg-[#f1f5f9] px-1.5 text-[11px] text-ink ${className}`}>
      {ticketCode(folio)}
    </span>
  );
}

export function Avatar({ name, size = 32, tone = "blue" }: { name: string; size?: number; tone?: "blue" | "slate" }) {
  return (
    <span
      aria-hidden
      className={`font-display inline-flex flex-none items-center justify-center rounded border text-[12px] font-semibold ${tone === "blue" ? "border-[#bfdbfe] bg-[#eff6ff] text-primary" : "border-line bg-[#f1f5f9] text-steel"}`}
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}
