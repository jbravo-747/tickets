import Link from "next/link";
import type { OrgBrand } from "@/lib/brand";
import { Brand } from "./Brand";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";

export function PublicHeader({ brand }: { brand?: OrgBrand | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
        <Link href="/" className="min-w-0"><Brand org={brand ? { name: brand.name, logoUrl: brand.logoUrl } : null} /></Link>
        <nav className="flex items-center gap-1">
          <Link href="/" className="btn btn-ghost hidden sm:inline-flex"><Icon name="inbox" size={16} />Tablero</Link>
          <Link href="/seguimiento" className="btn btn-ghost"><Icon name="search" size={16} /><span className="hidden sm:inline">Seguimiento</span></Link>
          <ThemeToggle />
          <Link href="/solicitud" className="btn btn-primary"><Icon name="add" size={16} /><span className="hidden sm:inline">Nueva solicitud</span></Link>
        </nav>
      </div>
    </header>
  );
}
