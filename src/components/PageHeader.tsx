import Link from "next/link";
import { Icon, type IconName } from "./Icon";

export function Breadcrumb({ items }: { items: { label: React.ReactNode; href?: string; icon?: IconName }[] }) {
  return (
    <nav aria-label="Ruta" className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-steel">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[#94a3b8]">/</span>}
          {it.href ? (
            <Link href={it.href} className="flex items-center gap-1 text-primary hover:underline">{it.icon && <Icon name={it.icon} size={14} />}{it.label}</Link>
          ) : (
            <span className="flex items-center gap-1 text-ink">{it.icon && <Icon name={it.icon} size={14} />}{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold leading-7 tracking-tight sm:text-[28px] sm:leading-9">{title}</h1>
        {subtitle && <p className="mt-0.5 text-steel">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Kpi({ label, value, tone = "default", icon, href }: { label: string; value: React.ReactNode; tone?: "default" | "p1" | "p2" | "p3" | "p4" | "warn"; icon?: IconName; href?: string }) {
  const bar = { default: "border-l-[#cbd5e1]", p1: "border-l-[#dc2626]", p2: "border-l-[#d97706]", p3: "border-l-[#1d4ed8]", p4: "border-l-[#16a34a]", warn: "border-l-[#dc2626]" }[tone];
  const body = (
    <>
      <div className="label-caps flex items-center gap-1">{icon && <Icon name={icon} size={14} />}{label}</div>
      <div className="font-display tnum mt-1 text-[28px] font-semibold leading-8">{value}</div>
    </>
  );
  const cls = `panel block border-l-[3px] px-4 py-3 ${bar}`;
  return href ? <Link href={href} className={`${cls} hover:border-[#94a3b8]`}>{body}</Link> : <div className={cls}>{body}</div>;
}
