"use client";

import type { Status } from "@prisma/client";
import { STATUSES, STATUS_LABEL, STATUS_STYLE } from "@/lib/constants";

/** Selector de estado que se guarda al cambiar. `action` es setStatus ya ligado al ticket. */
export function StatusSelect({ status, action }: { status: Status; action: (fd: FormData) => Promise<void> }) {
  return (
    <form action={action}>
      <select
        name="status" defaultValue={status} aria-label="Estado"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
      >
        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
    </form>
  );
}
