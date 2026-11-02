"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { ACCEPT_ATTR, MAX_FILES, MAX_FILE_SIZE, UPLOAD_PREFIX, formatBytes, type UploadedFile } from "@/lib/constants";

function safeName(name: string) {
  const clean = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return clean.slice(-80) || "archivo";
}

/**
 * Sube archivos directo a Vercel Blob y deja la lista en un input oculto (`name`) como JSON.
 * Mientras sube, agrega un input oculto `uploading` para que el servidor rechace el envío.
 */
export function EvidenceUploader({ name = "attachments", defaultValue, color = "#334155", compact = false }: {
  name?: string;
  defaultValue?: string;
  color?: string;
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
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center text-sm transition ${compact ? "px-3 py-3" : "px-4 py-6"} ${dragging ? "bg-slate-50" : "bg-white hover:bg-slate-50"}`}
        style={{ borderColor: dragging ? color : undefined }}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPT_ATTR} className="sr-only" onChange={(e) => void add(e.target.files)} />
        <span className="font-medium" style={{ color }}>
          {compact ? "📎 Adjuntar archivos" : "Arrastra aquí tus archivos o haz clic para elegirlos"}
        </span>
        {!compact && (
          <span className="mt-1 text-xs text-slate-500">
            Capturas de pantalla, fotos, PDF, videos cortos o documentos · hasta {MAX_FILES} archivos de {formatBytes(MAX_FILE_SIZE)}
          </span>
        )}
      </label>

      {(files.length > 0 || uploading) && (
        <ul className="mt-2 space-y-1 text-sm">
          {files.map((f) => (
            <li key={f.pathname} className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-1.5">
              <span className="truncate">{f.contentType.startsWith("image/") ? "🖼️" : "📄"} {f.name} <span className="text-xs text-slate-500">({formatBytes(f.size)})</span></span>
              <button type="button" onClick={() => setFiles((all) => all.filter((x) => x.pathname !== f.pathname))} className="text-xs text-red-700 hover:underline" aria-label={`Quitar ${f.name}`}>
                Quitar
              </button>
            </li>
          ))}
          {Object.entries(progress).map(([k, pct]) => (
            <li key={k} className="rounded border border-slate-200 px-3 py-1.5">
              <div className="mb-1 truncate text-xs text-slate-600">Subiendo {k.split("-").slice(0, -2).join("-")}… {Math.round(pct)}%</div>
              <div className="h-1.5 overflow-hidden rounded bg-slate-200">
                <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
