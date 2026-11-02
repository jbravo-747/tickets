import type { Priority, Status } from "@prisma/client";
import { PRIORITY_LABEL, PRIORITY_STYLE, STATUS_LABEL, STATUS_STYLE } from "@/lib/constants";

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[priority].badge}`}>
      <span className={`h-2 w-2 rounded-full ${PRIORITY_STYLE[priority].dot}`} aria-hidden />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}
