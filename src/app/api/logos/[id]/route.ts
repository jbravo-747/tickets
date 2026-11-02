import { get } from "@vercel/blob";
import { prisma } from "@/lib/db";

/** Logo público de una organización. La URL incluye ?v=<pathname> para poder cachear largo plazo. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await prisma.organization.findUnique({ where: { id }, select: { logoPathname: true, active: true } });
  if (!org?.logoPathname) return new Response("No encontrado", { status: 404 });
  const blob = await get(org.logoPathname, { access: "private" });
  if (!blob || blob.statusCode !== 200) return new Response("No encontrado", { status: 404 });
  return new Response(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}
