import "server-only";
import { head } from "@vercel/blob";
import { prisma } from "./db";
import { MAX_FILES, UPLOAD_PREFIX } from "./constants";

export type ParsedAttachment = { pathname: string; name: string; contentType: string; size: number };

/**
 * Valida la lista JSON que manda el cliente. No se confía en tamaño ni tipo del cliente:
 * se consultan en Blob con head(). Devuelve un mensaje de error en lugar de lanzar.
 */
export async function parseAttachments(raw: string | undefined): Promise<{ ok: true; files: ParsedAttachment[] } | { ok: false; error: string }> {
  if (!raw) return { ok: true, files: [] };
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Lista de archivos no válida" };
  }
  if (!Array.isArray(list) || list.length === 0) return { ok: true, files: [] };
  if (list.length > MAX_FILES) return { ok: false, error: `Máximo ${MAX_FILES} archivos` };
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { ok: false, error: "La subida de archivos no está configurada" };

  const files: ParsedAttachment[] = [];
  for (const item of list) {
    const pathname = typeof item?.pathname === "string" ? item.pathname : "";
    const name = typeof item?.name === "string" ? item.name.slice(0, 200) : "archivo";
    if (!pathname.startsWith(UPLOAD_PREFIX) || pathname.includes("..")) return { ok: false, error: "Archivo no válido" };
    try {
      const meta = await head(pathname);
      files.push({ pathname, name, contentType: meta.contentType || "application/octet-stream", size: meta.size });
    } catch {
      return { ok: false, error: `No se encontró el archivo ${name}; vuelve a subirlo` };
    }
  }
  const used = await prisma.attachment.count({ where: { pathname: { in: files.map((f) => f.pathname) } } });
  if (used > 0) return { ok: false, error: "Alguno de los archivos ya está asociado a otro ticket" };
  return { ok: true, files };
}
