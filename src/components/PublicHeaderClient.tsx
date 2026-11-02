import Link from "next/link";
import { Icon } from "./Icon";

export function PublicHeaderClient() {
  return (
    <header className="elevated sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display flex h-7 w-7 items-center justify-center rounded bg-primary text-[14px] font-bold text-white">M</span>
          <span className="font-display text-[15px] font-semibold tracking-tight">Mesa de ayuda</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/" className="btn btn-ghost hidden sm:inline-flex"><Icon name="inbox" size={16} />Tablero</Link>
          <Link href="/seguimiento" className="btn btn-ghost"><Icon name="search" size={16} /><span className="hidden sm:inline">Seguimiento</span></Link>
          <Link href="/solicitud" className="btn btn-primary"><Icon name="add" size={16} />Nueva solicitud</Link>
        </nav>
      </div>
    </header>
  );
}
