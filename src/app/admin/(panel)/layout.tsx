import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OPEN_STATUSES } from "@/lib/constants";
import { AdminNav } from "@/components/AdminNav";
import { Avatar } from "@/components/Badges";
import { Icon } from "@/components/Icon";
import { logout } from "../actions";
import { AccentScope } from "@/components/Accent";
import { ThemeToggle } from "@/components/ThemeToggle";
import { defaultBrand } from "@/lib/brand";

export const metadata = { title: "Administración", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [openCount, pendingCount] = await Promise.all([
    prisma.ticket.count({ where: { status: { in: OPEN_STATUSES } } }),
    prisma.ticket.count({ where: { status: { in: OPEN_STATUSES }, awaitingStaff: true } }),
  ]);
  const name = (await cookies()).get("admin_name")?.value || "Equipo de soporte";
  const env = process.env.VERCEL_ENV ?? "local";
  const brand = await defaultBrand();

  return (
    <AccentScope color={brand?.color}>
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-4 lg:left-60">
        <AdminNav openCount={openCount} pendingCount={pendingCount} env={env} brand={brand ? { name: brand.name, logoUrl: brand.logoUrl } : null} />
        <form action="/admin" className="focus-ring flex max-w-xl flex-1 items-center gap-1.5 rounded-md border border-line bg-canvas px-2 focus-within:bg-white">
          <Icon name="search" size={16} className="text-muted" />
          <input name="q" type="search" placeholder="Buscar por ID (T-00012), texto o solicitante…" aria-label="Buscar tickets" className="h-8 w-full bg-transparent text-[13px] outline-none placeholder:text-muted" />
          <input type="hidden" name="estado" value="todos" />
        </form>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 border-l border-line pl-3 sm:flex">
            <Avatar name={name} />
            <div className="leading-tight">
              <div className="font-display text-[13px] font-semibold">{name}</div>
              <div className="text-[11px] text-muted">Administración</div>
            </div>
          </div>
          <ThemeToggle />
          <form action={logout}>
            <button className="btn-icon" title="Cerrar sesión" aria-label="Cerrar sesión"><Icon name="logout" size={18} /></button>
          </form>
        </div>
      </header>
      <main className="px-4 pb-10 pt-[72px] lg:ml-60 lg:px-6">{children}</main>
    </div>
    </AccentScope>
  );
}
