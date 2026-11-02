"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FieldType } from "@prisma/client";
import { OTHER, ticketCode } from "@/lib/constants";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { Icon, type IconName } from "@/components/Icon";
import { submitTicket, type FormState } from "./actions";
import { requestTypeMeta } from "./requestTypeMeta";

type Props = {
  org: { id: string; name: string; intro: string; note: string; allowOtherType: boolean; logoUrl: string | null };
  areas: string[];
  types: string[];
  fields: { id: string; label: string; type: FieldType; options: string[]; required: boolean }[];
};

const initial: FormState = { attempt: 0, errors: {}, values: {} };
const MAX_DESC = 4000;

export function TicketForm({ org, areas, types, fields }: Props) {
  const [result, action, pending] = useActionState(submitTicket.bind(null, org.id), initial);
  const [clearedAt, setClearedAt] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const state: FormState = clearedAt === result.attempt ? { ...result, values: {}, errors: {} } : result;
  const e = state.errors;
  const v = state.values;

  if (state.ok && state.token) return <Success org={org} folio={state.folio!} token={state.token} />;

  return (
    <form key={`${state.attempt}-${resetKey}`} action={action} noValidate className="space-y-5">
      {/* Presentación */}
      <header className="panel px-6 py-7 sm:px-9 sm:py-9">
        <span className="inline-flex items-center gap-2 rounded-full bg-subtle py-1 pl-1.5 pr-3 text-[12px] font-medium text-steel">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo servido por /api/logos
            <img src={org.logoUrl} alt="" className="h-5 max-w-16 object-contain" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          )}
          {org.name} · Mesa de ayuda
        </span>
        <h1 className="mt-4 text-[32px] font-semibold leading-10 tracking-[-0.03em] sm:text-[40px] sm:leading-[48px]">Nueva solicitud de soporte</h1>
        {org.intro && <p className="mt-3 max-w-2xl whitespace-pre-line text-[16px] leading-7 text-steel sm:text-[17px]">{org.intro}</p>}
        {e._form && <p role="alert" className="mt-3 text-[13px] text-danger">{e._form}</p>}
      </header>

      {/* 01 Descripción */}
      <Step n={1} title={<label htmlFor="description">¿Qué necesitas o qué problema tienes? <Req /></label>}
        help="Describe qué pasa, desde cuándo, qué estabas haciendo y qué esperabas que pasara.">
        <DescriptionField defaultValue={v.description} error={e.description} />
      </Step>

      {/* 02 Tipo */}
      <TypeStep org={org} types={types} state={state} />

      {/* 03 Evidencia */}
      <Step n={3} title={<>Evidencia <span className="text-[13px] font-normal text-muted">(opcional, pero ayuda mucho)</span></>}
        help="Adjunta capturas de pantalla, fotos del error, archivos o documentos relacionados.">
        <EvidenceUploader defaultValue={v.attachments} />
        <FieldError id="attachments" msg={e.attachments} />
      </Step>

      {/* 04 Datos */}
      <Step n={4} title={<>Tus datos <Req /></>} help="Para identificar tu solicitud y darte seguimiento.">
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field id="name" label="Nombre completo" required error={e.name}>
            <div className="input-wrap" aria-invalid={!!e.name}>
              <Icon name="person" size={18} />
              <input id="name" name="name" autoComplete="name" defaultValue={v.name} aria-invalid={!!e.name} aria-describedby={e.name ? "name-error" : undefined} />
            </div>
          </Field>
          <Field id="email" label="Correo electrónico" required error={e.email} help="Con él podrás consultar tu solicitud junto con su ID.">
            <div className="input-wrap" aria-invalid={!!e.email}>
              <Icon name="alternate_email" size={18} />
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={v.email} aria-invalid={!!e.email} aria-describedby={e.email ? "email-error" : undefined} />
            </div>
          </Field>
          {areas.length > 0 && (
            <Field id="area" label="Área o departamento" required error={e.area}>
              <div className="input-wrap" aria-invalid={!!e.area}>
                <Icon name="apartment" size={18} />
                <select id="area" name="area" defaultValue={v.area ?? ""} aria-invalid={!!e.area} aria-describedby={e.area ? "area-error" : undefined}>
                  <option value="">Elige tu área</option>
                  {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </Field>
          )}
          <Field id="dueDate" label="Fecha tentativa de entrega" optional error={e.dueDate} help="El equipo confirmará la fecha según su carga de trabajo.">
            <div className="input-wrap" aria-invalid={!!e.dueDate}>
              <Icon name="calendar_today" size={18} />
              <input id="dueDate" name="dueDate" type="date" defaultValue={v.dueDate} aria-invalid={!!e.dueDate} />
            </div>
          </Field>
          {fields.map((f) => {
            const n = `f_${f.id}`;
            const common = { id: n, name: n, "aria-invalid": !!e[n], "aria-describedby": e[n] ? `${n}-error` : undefined, className: "input w-full" };
            return (
              <div key={f.id} className={f.type === "TEXTAREA" ? "sm:col-span-2" : ""}>
                <Field id={n} label={f.label} required={f.required} optional={!f.required} error={e[n]}>
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

      {org.note && (
        <aside className="flex gap-3 rounded-2xl bg-subtle px-5 py-4 sm:px-6">
          <Icon name="info" size={20} className="mt-0.5 text-primary-ink" />
          <p className="whitespace-pre-line text-[14px] leading-6 text-steel">{org.note}</p>
        </aside>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <button
          type="button" className="btn btn-ghost"
          onClick={() => { if (confirm("¿Borrar todo lo que escribiste?")) { setClearedAt(result.attempt); setResetKey((k) => k + 1); } }}
        >
          <Icon name="restart_alt" size={18} />Borrar formulario
        </button>
        <div className="flex items-center gap-3">
          {Object.keys(e).length > 0 && !pending && <span role="alert" className="text-[13px] text-danger">Revisa los campos marcados.</span>}
          <button type="submit" disabled={pending} className="btn btn-primary btn-lg px-6">
            {pending ? "Enviando…" : "Enviar solicitud"}<Icon name="send" size={18} />
          </button>
        </div>
      </div>
    </form>
  );
}

function Step({ n, title, help, children }: { n: number; title: React.ReactNode; help?: string; children: React.ReactNode }) {
  return (
    <section className="panel px-6 py-6 sm:px-9 sm:py-8">
      <div className="mb-5 flex items-start gap-4">
        <span className="font-display tnum flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-primary-soft text-[13px] font-semibold text-primary-ink" aria-hidden>
          {String(n).padStart(2, "0")}
        </span>
        <div>
          <h2 className="text-[20px] font-medium leading-[26px] tracking-[-0.02em]">{title}</h2>
          {help && <p className="mt-0.5 text-[13px] text-muted">{help}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function DescriptionField({ defaultValue, error }: { defaultValue?: string; error?: string }) {
  const [len, setLen] = useState(defaultValue?.length ?? 0);
  return (
    <div>
      <div className="mb-1.5 flex justify-end">
        <span className={`tnum text-[12px] ${len > MAX_DESC * 0.9 ? "text-warn" : "text-muted"}`}>{len.toLocaleString("es-MX")} / {MAX_DESC.toLocaleString("es-MX")} caracteres</span>
      </div>
      <textarea
        id="description" name="description" rows={6} defaultValue={defaultValue} required maxLength={MAX_DESC}
        onChange={(ev) => setLen(ev.currentTarget.value.length)}
        aria-invalid={!!error} aria-describedby={`description-tip${error ? " description-error" : ""}`}
        placeholder="Ej. Desde ayer no puedo entrar al correo desde la laptop; aparece “contraseña incorrecta” aunque ya la cambié…"
        className="input min-h-40 w-full resize-y text-[15px] leading-6"
      />
      <FieldError id="description" msg={error} />
      <p id="description-tip" className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
        <Icon name="lightbulb" size={16} />Consejo: indica si el problema pasa siempre o solo a veces; nos ayuda a priorizar.
      </p>
    </div>
  );
}

function TypeStep({ org, types, state }: { org: Props["org"]; types: string[]; state: FormState }) {
  const [selected, setSelected] = useState(state.values.type ?? "");
  const e = state.errors;

  const card = (value: string, label: string, icon: IconName, hint?: string, wide = false) => {
    const active = selected === value;
    return (
      <label
        key={value}
        className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${wide ? "sm:col-span-2 lg:col-span-3" : ""} ${active ? "border-primary bg-white shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]" : "border-transparent bg-subtle hover:border-line-strong"}`}
      >
        <input type="radio" name="type" value={value} defaultChecked={state.values.type === value} onChange={() => setSelected(value)} className="sr-only" />
        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${active ? "bg-primary text-on-primary" : "bg-white text-steel"}`}>
          <Icon name={icon} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium leading-5">{label}</span>
          {hint && <span className="block truncate text-[12px] text-muted">{hint}</span>}
        </span>
        {active ? <Icon name="check_circle" size={18} className="text-primary-ink" /> : wide && <Icon name="arrow_forward" size={18} className="text-muted" />}
      </label>
    );
  };

  return (
    <Step n={2} title={<>Tipo de solicitud <Req /></>} help="Elige la categoría que mejor describe lo que necesitas.">
      <fieldset aria-describedby={e.type ? "type-error" : undefined}>
        <legend className="sr-only">Tipo de solicitud</legend>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => {
            const m = requestTypeMeta(t);
            return card(t, t, m.icon, m.hint);
          })}
          {org.allowOtherType && card(OTHER, "Mi problema no está en la lista", "help", "Cuéntanos de qué se trata y lo clasificamos nosotros", true)}
        </div>
        <FieldError id="type" msg={e.type} />
        {org.allowOtherType && selected === OTHER && (
          <div className="mt-4">
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
  return <span className="text-danger" aria-label="obligatorio">*</span>;
}

function Field({ id, label, required, optional, error, help, children }: { id: string; label: string; required?: boolean; optional?: boolean; error?: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label} {required && <Req />} {optional && <span className="font-normal text-muted">(opcional)</span>}
      </label>
      {children}
      {error ? <FieldError id={id} msg={error} /> : help && <p className="field-help">{help}</p>}
    </div>
  );
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1 text-[12px] text-danger"><Icon name="error" size={15} />{msg}</p>;
}

function Success({ org, folio, token }: { org: Props["org"]; folio: number; token: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/seguimiento/${token}` : `/seguimiento/${token}`;
  return (
    <div className="panel space-y-6 px-6 py-8 sm:px-9">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary-ink"><Icon name="check_circle" size={24} /></span>
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Recibimos tu solicitud</h1>
          <p className="text-steel">{org.name}</p>
        </div>
      </div>
      <div className="rounded-2xl bg-subtle p-5">
        <div className="text-[13px] text-muted">ID de tu solicitud</div>
        <div className="ticket-id mt-1 text-[36px] leading-[44px] text-primary-ink">{ticketCode(folio)}</div>
        <p className="text-[13px] text-steel">Anótalo: lo necesitarás para dar seguimiento.</p>
      </div>
      <div>
        <span className="field-label">Enlace de seguimiento</span>
        <div className="flex gap-2">
          <input readOnly value={url} aria-label="Enlace de seguimiento" className="input flex-1 font-mono text-[12px]" onFocus={(ev) => ev.currentTarget.select()} />
          <button type="button" onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))} className="btn btn-secondary h-[38px]">
            <Icon name={copied ? "check" : "description"} size={16} />{copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <p className="field-help">Guárdalo para ver el avance y responder al equipo. También puedes buscarla en “Seguimiento” con tu ID y tu correo.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/seguimiento/${token}`} className="btn btn-primary btn-lg"><Icon name="open_in_new" size={16} />Ver mi solicitud</Link>
        <button type="button" onClick={() => location.reload()} className="btn btn-secondary btn-lg"><Icon name="add" size={16} />Enviar otra</button>
        <Link href="/" className="btn btn-ghost btn-lg">Ver tablero</Link>
      </div>
    </div>
  );
}
