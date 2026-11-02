import "server-only";
import { prisma } from "./db";
import { logoUrl } from "./constants";

export type OrgBrand = { name: string; color: string; logoUrl: string | null };

export function toBrand(org: { id: string; name: string; themeColor: string; logoPathname: string | null }): OrgBrand {
  return { name: org.name, color: org.themeColor, logoUrl: logoUrl(org) };
}

/** Marca por defecto: la organización activa si solo hay una; si hay varias, ninguna (estilo neutro). */
export async function defaultBrand(): Promise<OrgBrand | null> {
  const orgs = await prisma.organization.findMany({ where: { active: true }, take: 2, select: { id: true, name: true, themeColor: true, logoPathname: true } });
  return orgs.length === 1 ? toBrand(orgs[0]) : null;
}
