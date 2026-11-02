import Link from "next/link";
import type { Priority, Status } from "@prisma/client";
import { PRIORITY_LABEL, PRIORITY_STYLE, STATUS_LABEL } from "@/lib/constants";

export type CalendarItem = { id: string; folio: number; description: string; dueDate: Date; priority: Priority; status: Status };

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Calendario mensual (en UTC, igual que las fechas @db.Date). `month` es "YYYY-MM". */
export function Calendar({ month, items, hrefFor }: { month: string; items: CalendarItem[]; hrefFor: (month: string) => string }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const title = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);

  const byDay = new Map<number, CalendarItem[]>();
  for (const it of items) {
    const d = it.dueDate.getUTCDate();
    byDay.set(d, [...(byDay.get(d) ?? []), it]);
  }

  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <section aria-labelledby="cal-title" className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="cal-title" className="text-lg font-semibold capitalize">{title}</h2>
        <div className="flex gap-1">
          <Link href={hrefFor(prev)} className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50" aria-label="Mes anterior">←</Link>
          <Link href={hrefFor(today.slice(0, 7))} className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50">Hoy</Link>
          <Link href={hrefFor(next)} className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50" aria-label="Mes siguiente">→</Link>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded border border-slate-200 bg-slate-200 text-xs">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-slate-100 py-1 text-center font-medium text-slate-600">{d}</div>
        ))}
        {cells.map((day, i) => {
          const iso = day ? `${month}-${String(day).padStart(2, "0")}` : "";
          const list = day ? byDay.get(day) ?? [] : [];
          return (
            <div key={i} className={`min-h-20 bg-white p-1 ${day ? "" : "bg-slate-50"}`}>
              {day && (
                <>
                  <div className={`mb-0.5 text-right ${iso === today ? "font-bold text-blue-700" : "text-slate-500"}`}>{day}</div>
                  <ul className="space-y-0.5">
                    {list.slice(0, 3).map((it) => (
                      <li
                        key={it.id}
                        title={`#${it.folio} · ${it.description} · ${PRIORITY_LABEL[it.priority]} · ${STATUS_LABEL[it.status]}`}
                        className={`truncate rounded border-l-4 bg-slate-50 px-1 ${PRIORITY_STYLE[it.priority].border} ${it.status === "RESUELTO" || it.status === "CERRADO" ? "line-through opacity-60" : ""}`}
                      >
                        #{it.folio} {it.description}
                      </li>
                    ))}
                    {list.length > 3 && <li className="px-1 text-slate-500">+{list.length - 3} más</li>}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-500">Se muestran las solicitudes según su fecha tentativa de entrega.</p>
    </section>
  );
}
