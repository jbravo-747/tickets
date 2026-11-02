import { get } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

/**
 * Sirve evidencia privada. Acceso: sesión de admin, o el token de seguimiento del ticket (?t=)
 * siempre que el archivo no pertenezca a una nota interna.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const att = await prisma.attachment.findUnique({
    where: { id },
    include: { ticket: { select: { token: true } }, message: { select: { internal: true } } },
  });
  const notFound = () => new Response("No encontrado", { status: 404 });
  if (!att) return notFound();

  const t = new URL(req.url).searchParams.get("t");
  const allowed = (await isAdmin()) || (!!t && t === att.ticket.token && !att.message?.internal);
  if (!allowed) return notFound();

  const blob = await get(att.pathname, { access: "private" });
  if (!blob || blob.statusCode !== 200) return notFound();

  const inline = /^(image\/|video\/|application\/pdf$)/.test(att.contentType);
  return new Response(blob.stream, {
    headers: {
      "Content-Type": att.contentType,
      "Content-Length": String(att.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(att.name)}`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}
