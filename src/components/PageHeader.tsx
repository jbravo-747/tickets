import Link from "next/link";
import { Icon, type IconName } from "./Icon";

export function Breadcrumb({ items }: { items: { label: React.ReactNode; href?: string; icon?: IconName }[] }) {
  return (
    <nav aria-label="Ruta" className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-line-hover">/</span>}
          {it.href ? (
            <Link href={it.href} className="flex items-center gap-1 text-primary-ink hover:underline">{it.icon && <Icon name={it.icon} size={14} />}{it.label}</Link>
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
  const dot = { default: "", p1: "bg-p1", p2: "bg-p2", p3: "bg-p3", p4: "bg-p4", warn: "bg-p1" }[tone];
  const body = (
    <>
      <div className="flex items-center gap-1.5 text-[12px] text-muted">
        {dot ? <span className={`badge-dot ${dot}`} aria-hidden /> : icon && <Icon name={icon} size={14} />}
        {label}
      </div>
      <div className="font-display tnum mt-1.5 text-[26px] font-semibold leading-8 tracking-tight">{value}</div>
    </>
  );
  const cls = "panel block px-4 py-3 transition-colors";
  return href ? <Link href={href} className={`${cls} hover:border-line-hover`}>{body}</Link> : <div className={cls}>{body}</div>;
}
