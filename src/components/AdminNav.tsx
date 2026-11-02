"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "./Icon";
import { Brand, type BrandOrg } from "./Brand";

type Item = { href: string; label: string; icon: IconName; count?: number; external?: boolean };

export function AdminNav({ openCount, pendingCount, env, brand }: { openCount: number; pendingCount: number; env: string; brand: BrandOrg }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ops: Item[] = [
    { href: "/admin", label: "Pila de tickets", icon: "inbox", count: openCount },
    { href: "/admin?estado=pendientes", label: "Pendientes de respuesta", icon: "pending_actions", count: pendingCount },
    { href: "/admin/calendario", label: "Calendario y entregas", icon: "calendar_month" },
    { href: "/admin/organizaciones", label: "Organizaciones", icon: "domain" },
  ];
  const pub: Item[] = [
    { href: "/", label: "Tablero público", icon: "public", external: true },
    { href: "/solicitud", label: "Formulario de solicitud", icon: "description", external: true },
  ];
  const isActive = (href: string) => {
    if (href.includes("?") || pub.some((p) => p.href === href)) return false;
    if (href === "/admin") return path === "/admin" || path.startsWith("/admin/tickets");
    return path.startsWith(href);
  };

  const link = (it: Item) => {
    const active = isActive(it.href);
    return (
      <Link
        key={it.href} href={it.href} onClick={() => setOpen(false)} target={it.external ? "_blank" : undefined}
        aria-current={active ? "page" : undefined}
        className={`flex h-8 items-center gap-2 rounded border px-2 text-[13px] transition-colors ${active ? "border-line bg-white font-medium text-ink shadow-[0_1px_2px_rgba(15,23,42,.05)]" : "border-transparent text-steel hover:bg-subtle hover:text-ink"}`}
      >
        <Icon name={it.icon} size={18} className={active ? "text-primary-ink" : "text-muted"} />
        <span className="flex-1 truncate">{it.label}</span>
        {it.external && <Icon name="open_in_new" size={14} className="text-muted" />}
        {it.count !== undefined && it.count > 0 && <span className="counter">{it.count}</span>}
      </Link>
    );
  };

  return (
    <>
      <button type="button" className="btn-icon lg:hidden" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name={open ? "close" : "menu"} size={20} />
      </button>
      {open && <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col justify-between border-r border-line bg-canvas transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div>
          <div className="flex h-14 items-center gap-2 border-b border-line bg-white px-4">
            <Brand org={brand} />
          </div>
          <nav aria-label="Operaciones" className="space-y-0.5 px-3 pt-4">
            <div className="label-caps px-2 pb-1.5 text-muted">Operaciones</div>
            {ops.map(link)}
          </nav>
          <nav aria-label="Público" className="space-y-0.5 px-3 pt-5">
            <div className="label-caps px-2 pb-1.5 text-muted">Portal público</div>
            {pub.map(link)}
          </nav>
        </div>
        <div className="flex items-center justify-between border-t border-line bg-white px-4 py-3">
          <span className="flex items-center gap-2 text-[12px] text-steel">
            <span className={`h-2 w-2 rounded-full ${env === "production" ? "bg-p4" : "bg-p2"}`} />
            {env === "production" ? "Producción" : env === "preview" ? "Preview" : "Local"}
          </span>
          <span className="font-mono text-[11px] text-muted">v0.3</span>
        </div>
      </aside>
    </>
  );
}
