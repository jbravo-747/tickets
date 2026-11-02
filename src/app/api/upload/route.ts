import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { ALLOWED_CONTENT_TYPES, LOGO_MAX_SIZE, LOGO_PREFIX, LOGO_TYPES, MAX_FILE_SIZE, UPLOAD_PREFIX } from "@/lib/constants";
import { isAdmin } from "@/lib/auth";

/** Emite tokens de subida directa navegador → Vercel Blob (evita el límite de 4.5 MB de las funciones). */
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "La subida de archivos no está configurada (falta BLOB_READ_WRITE_TOKEN)" }, { status: 503 });
  }
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (pathname.includes("..")) throw new Error("Ruta no permitida");
        // Logos: solo administración, imágenes pequeñas
        if (pathname.startsWith(LOGO_PREFIX)) {
          if (!(await isAdmin())) throw new Error("No autorizado");
          return { allowedContentTypes: LOGO_TYPES, maximumSizeInBytes: LOGO_MAX_SIZE, addRandomSuffix: true, validUntil: Date.now() + 10 * 60 * 1000 };
        }
        if (!pathname.startsWith(UPLOAD_PREFIX)) throw new Error("Ruta no permitida");
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });
    return Response.json(json);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
