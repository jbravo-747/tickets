"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FieldType } from "@prisma/client";
import { OTHER, ticketCode } from "@/lib/constants";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { Icon, type IconName } from "@/components/Icon";
import { submitTicket, type FormState } from "./actions";

type Props = {
  org: { id: string; name: string; intro: string; note: string; themeColor: string; allowOtherType: boolean };
  areas: string[];
  types: string[];
  fields: { id: string; label: string; type: FieldType; options: string[]; required: boolean }[];
};

const initial: FormState = { attempt: 0, errors: {}, values: {} };

export function TicketForm({ org, areas, types, fields }: Props) {
  const [result, action, pending] = useActionState(submitTicket.bind(null, org.id), initial);
  const [clearedAt, setClearedAt] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const state: FormState = clearedAt === result.attempt ? { ...result, values: {}, errors: {} } : result;
  const e = state.errors;
  const v = state.values;

  if (state.ok && state.token) return <Success org={org} folio={state.folio!} token={state.token} />;

  return (
    <form key={`${state.attempt}-${resetKey}`} action={action} noValidate className="panel overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: org.themeColor }} />
      <header className="border-b border-[#f1f5f9] px-5 py-5 sm:px-8">
        <div className="label-caps mb-1 flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: org.themeColor }} />{org.name}</div>
        <h1 className="text-[22px] font-semibold leading-7 tracking-tight sm:text-[28px] sm:leading-9">Nueva solicitud de soporte</h1>
        {org.intro && <p className="mt-2 whitespace-pre-line text-[14px] leading-[22px] text-steel">{org.intro}</p>}
        {e._form && <p role="alert" className="mt-3 text-[12px] text-[#b91c1c]">{e._form}</p>}
      </header>

      <div className="divide-y divide-[#f1f5f9]">
        {/* 1. Descripción: lo más importante */}
        <Step n={1} icon="forum" title={<label htmlFor="description">¿Qué necesitas o qué problema tienes? <Req /></label>}
          help="Descríbelo con el mayor detalle posible: qué pasa, desde cuándo, qué estabas haciendo y qué esperabas que pasara.">
          <textarea
            id="description" name="description" rows={7} defaultValue={v.description} required
            aria-invalid={!!e.description} aria-describedby={e.description ? "description-error" : undefined}
            placeholder="Ej. Desde ayer no puedo entrar al correo desde la laptop; aparece “contraseña incorrecta” aunque ya la cambié…"
            className="input min-h-40 w-full resize-y text-[15px] leading-[22px]"
          />
          <FieldError id="description" msg={e.description} />
        </Step>

        {/* 2. Tipo de solicitud */}
        <TypeStep org={org} types={types} state={state} />

        {/* 3. Evidencia */}
        <Step n={3} icon="attach_file" title={<>Evidencia <span className="text-[13px] font-normal text-muted">(opcional)</span></>}
          help="Capturas de pantalla, fotos del error, archivos o cualquier cosa que nos ayude a entender el problema.">
          <EvidenceUploader defaultValue={v.attachments} />
          <FieldError id="attachments" msg={e.attachments} />
        </Step>

        {/* 4. Datos */}
        <Step n={4} icon="person" title="Tus datos">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Nombre" required error={e.name}>
              <input id="name" name="name" autoComplete="name" defaultValue={v.name} aria-invalid={!!e.name} aria-describedby={e.name ? "name-error" : undefined} className="input w-full" />
            </Field>
            <Field id="email" label="Correo electrónico" required error={e.email} help="Para darte seguimiento">
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={v.email} aria-invalid={!!e.email} aria-describedby={e.email ? "email-error" : undefined} className="input w-full" />
            </Field>
            {areas.length > 0 && (
              <Field id="area" label="Área" required error={e.area}>
                <select id="area" name="area" defaultValue={v.area ?? ""} aria-invalid={!!e.area} aria-describedby={e.area ? "area-error" : undefined} className="input w-full">
                  <option value="">Elige tu área</option>
                  {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
            )}
            <Field id="dueDate" label="Fecha tentativa de entrega" error={e.dueDate} help="Opcional">
              <input id="dueDate" name="dueDate" type="date" defaultValue={v.dueDate} aria-invalid={!!e.dueDate} className="input w-full" />
            </Field>
            {fields.map((f) => {
              const n = `f_${f.id}`;
              const common = { id: n, name: n, "aria-invalid": !!e[n], "aria-describedby": e[n] ? `${n}-error` : undefined, className: "input w-full" };
              return (
                <div key={f.id} className={f.type === "TEXTAREA" ? "sm:col-span-2" : ""}>
                  <Field id={n} label={f.label} required={f.required} error={e[n]}>
                    {f.type === "SELECT" ? (
                      <select {...common} defaultValue={v[n] ?? ""}>
                        <option value="">Elegir</option>
                        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === "TEXTAREA" ? (
                      <textarea {...common} defaultValue={v[n]} rows={3} />
                    ) : (
                      <input {...common} defaultValue={v[n]} type={f.type === "DATE" ? "date" : f.type === "NUMBER" ? "number" : "text"} />
                    )}
                  </Field>
                </div>
              );
            })}
          </div>
        </Step>
      </div>

      {org.note && (
        <div className="mx-5 mb-2 flex gap-2 rounded border border-[#fde68a] bg-[#fffbeb] p-3 text-[13px] text-[#92400e] sm:mx-8">
          <Icon name="schedule" size={16} className="mt-0.5" />
          <p className="whitespace-pre-line">{org.note}</p>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas px-5 py-4 sm:px-8">
        <button
          type="button" className="btn btn-ghost"
          onClick={() => { if (confirm("¿Borrar todo lo que escribiste?")) { setClearedAt(result.attempt); setResetKey((k) => k + 1); } }}
        >
          Borrar formulario
        </button>
        <div className="flex items-center gap-3">
          {Object.keys(e).length > 0 && !pending && <span role="alert" className="text-[12px] text-[#b91c1c]">Revisa los campos marcados.</span>}
          <button type="submit" disabled={pending} className="btn btn-primary btn-lg px-5">
            {pending ? "Enviando…" : "Enviar solicitud"}<Icon name="send" size={16} />
          </button>
        </div>
      </footer>
    </form>
  );
}

function Step({ n, icon, title, help, children }: { n: number; icon: IconName; title: React.ReactNode; help?: string; children: React.ReactNode }) {
  return (
    <section className="px-5 py-5 sm:px-8">
      <div className="mb-3 flex items-start gap-3">
        <span className="font-display tnum flex h-6 w-6 flex-none items-center justify-center rounded border border-[#bfdbfe] bg-[#eff6ff] text-[12px] font-semibold text-primary" aria-hidden>{n}</span>
        <div>
          <h2 className="flex items-center gap-1.5 text-[16px] font-semibold leading-6"><Icon name={icon} size={18} className="text-muted" />{title}</h2>
          {help && <p className="text-[13px] text-steel">{help}</p>}
        </div>
      </div>
      <div className="sm:pl-9">{children}</div>
    </section>
  );
}

function TypeStep({ org, types, state }: { org: Props["org"]; types: string[]; state: FormState }) {
  const [selected, setSelected] = useState(state.values.type ?? "");
  const e = state.errors;
  const option = (value: string, label: string, extra = "") => {
    const active = selected === value;
    return (
      <label
        key={value}
        className={`flex min-h-9 cursor-pointer items-center gap-2 rounded border px-3 py-2 transition-colors ${active ? "border-primary bg-[#eff6ff] font-medium text-primary-hover" : "border-line-strong bg-white hover:border-[#94a3b8]"} ${extra}`}
      >
        <input type="radio" name="type" value={value} defaultChecked={state.values.type === value} onChange={() => setSelected(value)} className="h-3.5 w-3.5" />
        {label}
      </label>
    );
  };
  return (
    <Step n={2} icon="label" title={<>Tipo de solicitud <Req /></>}>
      <fieldset aria-describedby={e.type ? "type-error" : undefined}>
        <legend className="sr-only">Tipo de solicitud</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {types.map((t) => option(t, t))}
          {org.allowOtherType && option(OTHER, "Mi problema no está en la lista", "border-dashed sm:col-span-2")}
        </div>
        <FieldError id="type" msg={e.type} />
        {org.allowOtherType && selected === OTHER && (
          <div className="mt-3">
            <label htmlFor="typeOther" className="field-label">¿De qué tipo es tu problema? <Req /></label>
            <input
              id="typeOther" name="typeOther" defaultValue={state.values.typeOther} autoFocus maxLength={120}
              placeholder="Ej. Impresora, alta de usuario, licencia de software…"
              aria-invalid={!!e.typeOther} aria-describedby={e.typeOther ? "typeOther-error" : undefined}
              className="input w-full"
            />
            <FieldError id="typeOther" msg={e.typeOther} />
          </div>
        )}
      </fieldset>
    </Step>
  );
}

function Req() {
  return <span className="text-[#dc2626]" aria-label="obligatorio">*</span>;
}

function Field({ id, label, required, error, help, children }: { id: string; label: string; required?: boolean; error?: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label} {required && <Req />} {help && <span className="font-normal text-muted">· {help}</span>}
      </label>
      {children}
      <FieldError id={id} msg={error} />
    </div>
  );
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return <p id={`${id}-error`} role="alert" className="mt-1 flex items-center gap-1 text-[12px] text-[#b91c1c]"><Icon name="error" size={14} />{msg}</p>;
}

function Success({ org, folio, token }: { org: Props["org"]; folio: number; token: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/seguimiento/${token}` : `/seguimiento/${token}`;
  return (
    <div className="panel overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: org.themeColor }} />
      <div className="space-y-5 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded border border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]"><Icon name="check_circle" size={22} /></span>
          <div>
            <h1 className="text-[20px] font-semibold">Recibimos tu solicitud</h1>
            <p className="text-steel">{org.name}</p>
          </div>
        </div>
        <div className="rounded-lg border border-[#bfdbfe] bg-[#eff6ff] p-4">
          <div className="label-caps !text-primary-hover">ID de tu solicitud</div>
          <div className="ticket-id mt-1 text-[32px] leading-10 text-primary">{ticketCode(folio)}</div>
          <p className="text-[12px] text-steel">Anótalo: lo necesitarás para dar seguimiento.</p>
        </div>
        <div>
          <span className="field-label">Enlace de seguimiento (guárdalo para ver el avance y responder)</span>
          <div className="flex gap-2">
            <input readOnly value={url} aria-label="Enlace de seguimiento" className="input flex-1 font-mono text-[12px]" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))} className="btn btn-secondary">
              <Icon name={copied ? "check" : "description"} size={16} />{copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="mt-1 text-[12px] text-muted">También puedes consultarla en “Seguimiento” con tu ID y tu correo.</p>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-[#f1f5f9] pt-4">
          <Link href={`/seguimiento/${token}`} className="btn btn-primary btn-lg"><Icon name="open_in_new" size={16} />Ver mi solicitud</Link>
          <button type="button" onClick={() => location.reload()} className="btn btn-secondary btn-lg"><Icon name="add" size={16} />Enviar otra</button>
          <Link href="/" className="btn btn-ghost btn-lg">Ver tablero</Link>
        </div>
      </div>
    </div>
  );
}
