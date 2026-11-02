"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Icon } from "./Icon";
import { ACCEPT_ATTR, MAX_FILES, MAX_FILE_SIZE, UPLOAD_PREFIX, formatBytes, type UploadedFile } from "@/lib/constants";

function safeName(name: string) {
  const clean = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return clean.slice(-80) || "archivo";
}

/**
 * Sube archivos directo a Vercel Blob y deja la lista en un input oculto (`name`) como JSON.
 * Mientras sube, agrega un input oculto `uploading` para que el servidor rechace el envío.
 */
export function EvidenceUploader({ name = "attachments", defaultValue, compact = false }: {
  name?: string;
  defaultValue?: string;
  compact?: boolean;
}) {
  const [files, setFiles] = useState<UploadedFile[]>(() => {
    try {
      return defaultValue ? (JSON.parse(defaultValue) as UploadedFile[]) : [];
    } catch {
      return [];
    }
  });
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploading = Object.keys(progress).length > 0;

  async function add(list: FileList | File[] | null) {
    if (!list) return;
    setError(null);
    const incoming = Array.from(list);
    if (files.length + incoming.length + Object.keys(progress).length > MAX_FILES) {
      setError(`Puedes adjuntar hasta ${MAX_FILES} archivos.`);
      return;
    }
    await Promise.all(
      incoming.map(async (file) => {
        if (file.size > MAX_FILE_SIZE) {
          setError(`“${file.name}” supera ${formatBytes(MAX_FILE_SIZE)}.`);
          return;
        }
        const key = `${file.name}-${file.size}-${Math.random()}`;
        setProgress((p) => ({ ...p, [key]: 0 }));
        try {
          const res = await upload(`${UPLOAD_PREFIX}${safeName(file.name)}`, file, {
            access: "private",
            handleUploadUrl: "/api/upload",
            contentType: file.type || undefined,
            multipart: file.size > 5 * 1024 * 1024,
            onUploadProgress: ({ percentage }) => setProgress((p) => ({ ...p, [key]: percentage })),
          });
          setFiles((f) => [...f, { pathname: res.pathname, name: file.name, size: file.size, contentType: file.type }]);
        } catch (e) {
          const msg = (e as Error).message || "";
          setError(/content type/i.test(msg) ? `El tipo de “${file.name}” no está permitido.` : `No se pudo subir “${file.name}”. ${msg}`);
        } finally {
          setProgress((p) => {
            const { [key]: _, ...rest } = p;
            void _;
            return rest;
          });
        }
      }),
    );
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(files)} />
      {uploading && <input type="hidden" name="uploading" value="1" />}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void add(e.dataTransfer.files); }}
        className={`flex cursor-pointer items-center justify-center text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${compact
          ? "h-10 gap-1.5 rounded-xl border border-dashed px-3"
          : "flex-col gap-2 rounded-2xl border border-dashed px-4 py-9"} ${dragging ? "border-primary bg-primary-soft" : "border-line-strong bg-subtle hover:border-line-hover"}`}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPT_ATTR} className="sr-only" onChange={(e) => void add(e.target.files)} />
        {compact ? (
          <>
            <Icon name="attach_file" size={16} className="text-primary-ink" />
            <span className="text-[13px] font-medium text-primary-ink">Adjuntar archivos</span>
          </>
        ) : (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary-ink shadow-[0_1px_3px_rgb(28_25_23/.08)]">
              <Icon name="cloud_upload" size={22} />
            </span>
            <span className="text-[14px] font-medium text-ink-2">
              Arrastra aquí tus archivos o <span className="text-primary-ink underline underline-offset-2">haz clic para elegirlos</span>
            </span>
            <span className="text-[12px] text-muted">
              Imágenes, PDF, videos cortos o documentos · hasta {MAX_FILES} archivos de {formatBytes(MAX_FILE_SIZE)} cada uno
            </span>
          </>
        )}
      </label>

      {(files.length > 0 || uploading) && (
        <div className="mt-4">
          {!compact && <div className="mb-2 text-[12px] font-medium text-muted">Archivos listos para adjuntar ({files.length})</div>}
          <ul className="space-y-1.5">
            {files.map((f) => (
              <li key={f.pathname} className="flex items-center justify-between gap-3 rounded-xl bg-subtle py-2 pl-2.5 pr-1.5">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white text-steel">
                    <Icon name={f.contentType.startsWith("image/") ? "image" : "description"} size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{f.name}</span>
                    <span className="tnum block text-[11px] text-muted">{formatBytes(f.size)}</span>
                  </span>
                </span>
                <span className="flex flex-none items-center gap-1">
                  <span className="hidden items-center gap-1 text-[12px] text-ok sm:flex"><Icon name="check_circle" size={15} />Subido</span>
                  <button type="button" onClick={() => setFiles((all) => all.filter((x) => x.pathname !== f.pathname))} className="btn-icon" aria-label={`Quitar ${f.name}`}>
                    <Icon name="delete" size={17} />
                  </button>
                </span>
              </li>
            ))}
            {Object.entries(progress).map(([k, pct]) => (
              <li key={k} className="rounded-xl bg-subtle px-3 py-2.5">
                <div className="tnum mb-1.5 truncate text-[12px] text-steel">Subiendo {k.split("-").slice(0, -2).join("-")}… {Math.round(pct)}%</div>
                <div className="h-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: "var(--color-primary)" }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-[12px] text-danger">{error}</p>}
    </div>
  );
}
