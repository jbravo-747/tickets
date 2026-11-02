import Link from "next/link";
import type { Priority, Status } from "@prisma/client";
import { PRIORITIES, PRIORITY_CODE, PRIORITY_LABEL, PRIORITY_STYLE, STATUS_LABEL, ticketCode, todayISO } from "@/lib/constants";
import { Icon } from "./Icon";

export type CalendarItem = { id: string; folio: number; description: string; dueDate: Date; priority: Priority; status: Status };

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/**
 * Calendario mensual en UTC (igual que las fechas @db.Date). `month` es "YYYY-MM".
 * `ticketHref` vuelve las tarjetas enlaces (admin); sin él son solo informativas (público).
 */
export function Calendar({ month, items, hrefFor, ticketHref, maxPerDay = 3 }: {
  month: string;
  items: CalendarItem[];
  hrefFor: (month: string) => string;
  ticketHref?: (id: string) => string;
  maxPerDay?: number;
}) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  const today = todayISO();
  const rawTitle = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

  const byDay = new Map<number, CalendarItem[]>();
  for (const it of items) {
    const d = it.dueDate.getUTCDate();
    byDay.set(d, [...(byDay.get(d) ?? []), it]);
  }
  for (const list of byDay.values()) list.sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));

  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <section aria-labelledby="cal-title" className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle px-4 py-2.5">
        <div className="flex items-center gap-1">
          <Link href={hrefFor(prev)} className="btn-icon" aria-label="Mes anterior"><Icon name="chevron_left" /></Link>
          <h2 id="cal-title" className="flex items-center gap-1.5 px-1 text-[14px] font-semibold">
            <Icon name="calendar_month" size={16} className="text-primary-ink" />{title}
          </h2>
          <Link href={hrefFor(next)} className="btn-icon" aria-label="Mes siguiente"><Icon name="chevron_right" /></Link>
        </div>
        <Link href={hrefFor(today.slice(0, 7))} className="btn btn-secondary h-7 px-2 text-[12px]">Hoy</Link>
      </div>

      <div className="grid grid-cols-7 border-b border-line bg-canvas">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`py-2 text-center text-[12px] font-medium ${i > 4 ? "text-muted" : "text-steel"}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const iso = day ? `${month}-${String(day).padStart(2, "0")}` : "";
          const list = day ? byDay.get(day) ?? [] : [];
          const isToday = iso === today;
          const weekend = i % 7 > 4;
          return (
            <div
              key={i}
              className={`min-h-24 border-b border-r border-subtle p-1.5 [&:nth-child(7n)]:border-r-0 ${!day ? "bg-subtle/60" : weekend ? "bg-canvas" : "bg-white"} `}
            >
              {day && (
                <>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`tnum flex h-5 min-w-5 items-center justify-center rounded-full text-[11px] ${isToday ? "bg-primary px-1 font-semibold text-on-primary" : weekend ? "text-muted" : "text-steel"}`}>{day}</span>
                  </div>
                  <ul className="space-y-1">
                    {list.slice(0, maxPerDay).map((it) => {
                      const done = it.status === "RESUELTO" || it.status === "CERRADO";
                      const s = PRIORITY_STYLE[it.priority];
                      const body = (
                        <>
                          <span className="flex items-center gap-1">
                            <span className={`h-1.5 w-1.5 flex-none rounded-full ${done ? "bg-dot-muted" : s.dot}`} aria-hidden />
                            <span className={`ticket-id text-[10px] ${done ? "text-muted" : "text-ink-2"}`}>{ticketCode(it.folio)}</span>
                          </span>
                          <span className={`block truncate text-[11px] leading-[14px] ${done ? "text-muted line-through" : "text-steel"}`}>{it.description}</span>
                        </>
                      );
                      const cls = "block rounded border border-line bg-white px-1.5 py-1";
                      const title = `${ticketCode(it.folio)} · ${it.description} · ${PRIORITY_CODE[it.priority]} ${PRIORITY_LABEL[it.priority]} · ${STATUS_LABEL[it.status]}`;
                      return (
                        <li key={it.id} title={title}>
                          {ticketHref ? <Link href={ticketHref(it.id)} className={`${cls} hover:border-line-hover`}>{body}</Link> : <div className={cls}>{body}</div>}
                        </li>
                      );
                    })}
                    {list.length > maxPerDay && <li className="px-1 text-[11px] font-medium text-steel">+{list.length - maxPerDay} más</li>}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-[12px] text-steel">
        {PRIORITIES.map((p) => (
          <span key={p} className="flex items-center gap-1.5"><span className={`badge-dot ${PRIORITY_STYLE[p].dot}`} />{PRIORITY_CODE[p]} {PRIORITY_LABEL[p]}</span>
        ))}
        <span className="ml-auto text-muted">Fechas tentativas de entrega · Hora del centro de México</span>
      </div>
    </section>
  );
}
