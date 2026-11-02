"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { LOGO_MAX_SIZE, LOGO_PREFIX, LOGO_TYPES, formatBytes } from "@/lib/constants";
import { Icon } from "@/components/Icon";

/** Sube el logo directo a Blob y deja su pathname en el input oculto `logo`. */
export function LogoField({ currentUrl }: { currentUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [pathname, setPathname] = useState("");
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function pick(file?: File) {
    if (!file) return;
    setError(null);
    if (!LOGO_TYPES.includes(file.type)) return setError("Usa PNG, JPG o WebP.");
    if (file.size > LOGO_MAX_SIZE) return setError(`Máximo ${formatBytes(LOGO_MAX_SIZE)}.`);
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const res = await upload(`${LOGO_PREFIX}logo.${ext}`, file, { access: "private", handleUploadUrl: "/api/upload", contentType: file.type });
      setPathname(res.pathname);
      setPreview(URL.createObjectURL(file));
      setRemove(false);
    } catch (e) {
      setError(`No se pudo subir: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <span className="field-label">Logo</span>
      <input type="hidden" name="logo" value={pathname} />
      {remove && <input type="hidden" name="removeLogo" value="on" />}
      {busy && <input type="hidden" name="uploading" value="1" />}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-14 w-36 items-center justify-center rounded-md border border-line bg-canvas p-2">
          {preview && !remove ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa local
            <img src={preview} alt="Logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <Icon name="image" size={22} className="text-muted" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <label className="btn btn-secondary cursor-pointer">
              <Icon name="upload_file" size={16} />{busy ? "Subiendo…" : preview && !remove ? "Cambiar" : "Subir logo"}
              <input ref={input} type="file" accept={LOGO_TYPES.join(",")} className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} disabled={busy} />
            </label>
            {preview && !remove && (
              <button type="button" className="btn btn-ghost" onClick={() => { setRemove(true); setPathname(""); }}>
                <Icon name="delete" size={16} />Quitar
              </button>
            )}
          </div>
          <span className="text-[12px] text-muted">PNG, JPG o WebP de hasta 2 MB. Mejor con fondo transparente.</span>
        </div>
      </div>
      {error && <p role="alert" className="mt-1 text-[12px] text-danger">{error}</p>}
    </div>
  );
}
