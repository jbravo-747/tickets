import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <nav className="flex items-center gap-5 text-sm">
            <span className="font-semibold">Administración</span>
            <Link href="/admin" className="hover:underline">Tickets</Link>
            <Link href="/admin/organizaciones" className="hover:underline">Organizaciones</Link>
            <Link href="/" className="text-slate-500 hover:underline">Ver tablero público ↗</Link>
          </nav>
          <form action={logout}>
            <button className="text-sm text-slate-600 hover:underline">Cerrar sesión</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </>
  );
}
