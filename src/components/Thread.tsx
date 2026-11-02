import type { AuthorType } from "@prisma/client";
import { formatBytes, formatDateTime } from "@/lib/constants";

export type ThreadAttachment = { id: string; name: string; contentType: string; size: number };
export type ThreadMessage = {
  id: string;
  authorType: AuthorType;
  authorName: string;
  body: string;
  internal: boolean;
  createdAt: Date;
  attachments: ThreadAttachment[];
};

export function fileHref(id: string, token?: string) {
  return `/api/archivos/${id}${token ? `?t=${encodeURIComponent(token)}` : ""}`;
}

export function AttachmentList({ files, token }: { files: ThreadAttachment[]; token?: string }) {
  if (files.length === 0) return null;
  const images = files.filter((f) => f.contentType.startsWith("image/") && !/hei[cf]/.test(f.contentType));
  const others = files.filter((f) => !images.includes(f));
  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((f) => (
            <a key={f.id} href={fileHref(f.id, token)} target="_blank" rel="noopener" className="block overflow-hidden rounded border border-slate-200" title={f.name}>
              {/* eslint-disable-next-line @next/next/no-img-element -- archivo privado servido por la API */}
              <img src={fileHref(f.id, token)} alt={f.name} className="h-24 w-24 object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <ul className="space-y-1 text-sm">
          {others.map((f) => (
            <li key={f.id}>
              <a href={fileHref(f.id, token)} target="_blank" rel="noopener" className="text-blue-700 hover:underline">
                📄 {f.name}
              </a>{" "}
              <span className="text-xs text-slate-500">({formatBytes(f.size)})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Hilo del ticket. Para el solicitante (`token` presente) las notas internas deben venir ya filtradas. */
export function Thread({ messages, token, staffLabel = "Equipo de soporte" }: { messages: ThreadMessage[]; token?: string; staffLabel?: string }) {
  if (messages.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Aún no hay mensajes en este ticket.</p>;
  }
  return (
    <ol className="space-y-3">
      {messages.map((m) => {
        if (m.authorType === "SYSTEM") {
          return (
            <li key={m.id} className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-px flex-1 bg-slate-200" />
              <span>{m.body} · {formatDateTime(m.createdAt)}</span>
              <span className="h-px flex-1 bg-slate-200" />
            </li>
          );
        }
        const staff = m.authorType === "STAFF";
        return (
          <li key={m.id} className={`flex ${staff ? "justify-end" : "justify-start"}`}>
            <div className={`w-full max-w-[90%] rounded-lg border p-3 sm:max-w-[80%] ${m.internal ? "border-amber-300 bg-amber-50" : staff ? "border-slate-200 bg-slate-100" : "border-slate-200 bg-white"}`}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{m.authorName}</span>
                <span>{staff ? (token ? staffLabel : "Equipo") : "Solicitante"}</span>
                {m.internal && <span className="rounded bg-amber-200 px-1.5 font-medium text-amber-900">Nota interna</span>}
                <span>· {formatDateTime(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-line text-sm">{m.body}</p>
              <AttachmentList files={m.attachments} token={token} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
