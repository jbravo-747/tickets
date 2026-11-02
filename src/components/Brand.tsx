export type BrandOrg = { name: string; logoUrl?: string | null } | null;

/** Logo de la organización, o la inicial sobre el color de acento si no hay logo. */
export function Brand({ org, fallbackName = "Mesa de ayuda", showName = true }: { org?: BrandOrg; fallbackName?: string; showName?: boolean }) {
  const name = org?.name ?? fallbackName;
  return (
    <span className="flex min-w-0 items-center gap-2">
      {org?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo servido por /api/logos
        <img src={org.logoUrl} alt={org.name} className="h-8 max-w-[150px] flex-none object-contain" />
      ) : (
        <span className="font-display flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primary text-[14px] font-bold text-on-primary" aria-hidden>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      {showName && (!org?.logoUrl || !org) && <span className="font-display truncate text-[15px] font-semibold tracking-tight">{name}</span>}
      {showName && org?.logoUrl && <span className="hidden truncate text-[13px] font-medium text-steel sm:inline">Mesa de ayuda</span>}
    </span>
  );
}
