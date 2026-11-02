import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="bg-slate-800 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Mesa de ayuda
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">Tablero</Link>
          <Link href="/solicitud" className="rounded bg-white px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-100">
            Nueva solicitud
          </Link>
        </nav>
      </div>
    </header>
  );
}
