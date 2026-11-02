import type { AuthorType } from "@prisma/client";
import { formatBytes, formatDateTime, relativeTime } from "@/lib/constants";
import { Icon, type IconName } from "./Icon";

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
  const isImg = (f: ThreadAttachment) => f.contentType.startsWith("image/") && !/hei[cf]/.test(f.contentType);
  const images = files.filter(isImg);
  const others = files.filter((f) => !isImg(f));
  return (
    <div className="mt-3 space-y-2">
      <div className="label-caps flex items-center gap-1"><Icon name="attach_file" size={14} /> Evidencia ({files.length})</div>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((f) => (
            <a key={f.id} href={fileHref(f.id, token)} target="_blank" rel="noopener" title={f.name} className="block overflow-hidden rounded border border-line hover:border-line-hover">
              {/* eslint-disable-next-line @next/next/no-img-element -- archivo privado servido por la API */}
              <img src={fileHref(f.id, token)} alt={f.name} className="h-24 w-24 object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {others.map((f) => (
            <li key={f.id}>
              <a href={fileHref(f.id, token)} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded border border-line bg-canvas px-2 hover:border-line-hover">
                <Icon name="description" size={16} className="text-muted" />
                <span className="max-w-56 truncate">{f.name}</span>
                <span className="tnum text-[11px] text-muted">{formatBytes(f.size)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const NODE: Record<"system" | "staff" | "internal" | "requester", { icon: IconName; node: string; card: string; title: string }> = {
  system: { icon: "sync", node: "bg-canvas border-line text-muted", card: "", title: "" },
  staff: { icon: "mark_email_read", node: "bg-white border-line-strong text-primary-ink", card: "border-line bg-white", title: "text-ink" },
  internal: { icon: "lock", node: "bg-white border-note-line text-note-ink", card: "border-note-line bg-note-bg", title: "text-note-ink" },
  requester: { icon: "person", node: "bg-white border-line-strong text-steel", card: "border-line bg-white", title: "text-ink" },
};

/**
 * Línea de tiempo del ticket. Para el solicitante (`token` presente) las notas internas deben venir ya filtradas.
 */
export function Thread({ messages, token }: { messages: ThreadMessage[]; token?: string }) {
  if (messages.length === 0) {
    return (
      <div className="panel flex items-center gap-2 px-5 py-6 text-muted">
        <Icon name="forum" size={18} /> Aún no hay actividad en este ticket.
      </div>
    );
  }
  return (
    <ol className="relative space-y-3 pl-8">
      <span aria-hidden className="absolute bottom-3 left-[11px] top-2 w-px bg-line" />
      {messages.map((m) => {
        const kind = m.authorType === "SYSTEM" ? "system" : m.internal ? "internal" : m.authorType === "STAFF" ? "staff" : "requester";
        const s = NODE[kind];
        return (
          <li key={m.id} className="relative">
            <span className={`absolute -left-8 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border ${s.node}`}>
              <Icon name={s.icon} size={14} />
            </span>
            {kind === "system" ? (
              <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-[12px] text-steel">
                <span>{m.body}</span>
                <time className="tnum text-[11px] text-muted" dateTime={m.createdAt.toISOString()} title={formatDateTime(m.createdAt)}>{relativeTime(m.createdAt)}</time>
              </div>
            ) : (
              <article className={`rounded-lg border p-4 ${s.card}`}>
                <header className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-display text-[13px] font-semibold ${s.title}`}>{m.authorName}</span>
                    <span className="text-[12px] text-muted">
                      {kind === "requester" ? "Solicitante" : kind === "internal" ? "Nota interna" : token ? "Equipo de soporte" : "Respuesta pública"}
                    </span>
                    
                  </div>
                  <time className="tnum text-[11px] text-muted" dateTime={m.createdAt.toISOString()} title={formatDateTime(m.createdAt)}>{relativeTime(m.createdAt)}</time>
                </header>
                <p className="whitespace-pre-line text-[14px] leading-[22px] text-ink-2">{m.body}</p>
                <AttachmentList files={m.attachments} token={token} />
              </article>
            )}
          </li>
        );
      })}
    </ol>
  );
}
