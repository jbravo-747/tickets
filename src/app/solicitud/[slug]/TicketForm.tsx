"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FieldType } from "@prisma/client";
import { OTHER, ticketCode } from "@/lib/constants";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { submitTicket, type FormState } from "./actions";

type Props = {
  org: { id: string; name: string; intro: string; note: string; themeColor: string; allowOtherType: boolean };
  areas: string[];
  types: string[];
  fields: { id: string; label: string; type: FieldType; options: string[]; required: boolean }[];
};

const initial: FormState = { attempt: 0, errors: {}, values: {} };
const inputCls = "w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2";

export function TicketForm({ org, areas, types, fields }: Props) {
  const [result, action, pending] = useActionState(submitTicket.bind(null, org.id), initial);
  const [clearedAt, setClearedAt] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const state: FormState = clearedAt === result.attempt ? { ...result, values: {}, errors: {} } : result;
  const color = org.themeColor;
  const ring = { "--tw-ring-color": `${color}55` } as React.CSSProperties;
  const e = state.errors;
  const v = state.values;

  if (state.ok && state.token) return <Success org={org} folio={state.folio!} token={state.token} />;

  const errCls = (k: string) => (e[k] ? "border-red-600" : "border-slate-300");

  return (
    <form key={`${state.attempt}-${resetKey}`} action={action} noValidate className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="h-2" style={{ backgroundColor: color }} />
      <div className="space-y-8 p-6 sm:p-8">
        <header>
          <h1 className="text-2xl font-semibold">{org.name}</h1>
          <p className="text-sm font-medium" style={{ color }}>Nueva solicitud de soporte</p>
          {org.intro && <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{org.intro}</p>}
          {e._form && <p role="alert" className="mt-3 text-sm text-red-700">{e._form}</p>}
        </header>

        {/* 1. Lo más importante: la descripción */}
        <section aria-labelledby="s-desc">
          <h2 id="s-desc" className="mb-1 text-lg font-semibold">
            <label htmlFor="description">¿Qué necesitas o qué problema tienes? <span className="text-red-600">*</span></label>
          </h2>
          <p id="description-help" className="mb-2 text-sm text-slate-500">
            Descríbelo con el mayor detalle posible: qué pasa, desde cuándo, qué estabas haciendo y qué esperabas que pasara.
          </p>
          <textarea
            id="description" name="description" rows={7} defaultValue={v.description} required
            aria-invalid={!!e.description} aria-describedby={`description-help${e.description ? " description-error" : ""}`}
            placeholder="Ej. Desde ayer no puedo entrar al correo desde la laptop; aparece el mensaje “contraseña incorrecta” aunque la cambié…"
            className={`${inputCls} ${errCls("description")} text-base`} style={ring}
          />
          <FieldError id="description" msg={e.description} />
        </section>

        {/* 2. Tipo de solicitud, con opción de problema no listado */}
        <TypeSection org={org} types={types} state={state} ring={ring} />

        {/* 3. Evidencia */}
        <section aria-labelledby="s-evid">
          <h2 id="s-evid" className="mb-1 text-lg font-semibold">Evidencia <span className="text-sm font-normal text-slate-500">(opcional)</span></h2>
          <p className="mb-2 text-sm text-slate-500">Adjunta capturas de pantalla, fotos del error, archivos o cualquier cosa que nos ayude a entender el problema.</p>
          <EvidenceUploader defaultValue={v.attachments} color={color} />
          <FieldError id="attachments" msg={e.attachments} />
        </section>

        {/* 4. Datos de contacto */}
        <section aria-labelledby="s-datos" className="space-y-4">
          <h2 id="s-datos" className="text-lg font-semibold">Tus datos</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Nombre" required error={e.name}>
              <input id="name" name="name" autoComplete="name" defaultValue={v.name} aria-invalid={!!e.name} aria-describedby={e.name ? "name-error" : undefined} className={`${inputCls} ${errCls("name")}`} style={ring} />
            </Field>
            <Field id="email" label="Correo electrónico" required error={e.email} help="Aquí te avisaremos del avance">
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={v.email} aria-invalid={!!e.email} aria-describedby={e.email ? "email-error" : undefined} className={`${inputCls} ${errCls("email")}`} style={ring} />
            </Field>
            {areas.length > 0 && (
              <Field id="area" label="Área" required error={e.area}>
                <select id="area" name="area" defaultValue={v.area ?? ""} aria-invalid={!!e.area} aria-describedby={e.area ? "area-error" : undefined} className={`${inputCls} ${errCls("area")}`} style={ring}>
                  <option value="">Elige tu área</option>
                  {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
            )}
            <Field id="dueDate" label="Fecha tentativa de entrega" error={e.dueDate} help="Opcional">
              <input id="dueDate" name="dueDate" type="date" defaultValue={v.dueDate} aria-invalid={!!e.dueDate} className={`${inputCls} ${errCls("dueDate")}`} style={ring} />
            </Field>
            {fields.map((f) => {
              const n = `f_${f.id}`;
              const common = { id: n, name: n, defaultValue: v[n], "aria-invalid": !!e[n], "aria-describedby": e[n] ? `${n}-error` : undefined, className: `${inputCls} ${errCls(n)}`, style: ring };
              return (
                <div key={f.id} className={f.type === "TEXTAREA" ? "sm:col-span-2" : ""}>
                  <Field id={n} label={f.label} required={f.required} error={e[n]}>
                    {f.type === "SELECT" ? (
                      <select {...common} defaultValue={v[n] ?? ""}>
                        <option value="">Elegir</option>
                        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === "TEXTAREA" ? (
                      <textarea {...common} rows={3} />
                    ) : (
                      <input {...common} type={f.type === "DATE" ? "date" : f.type === "NUMBER" ? "number" : "text"} />
                    )}
                  </Field>
                </div>
              );
            })}
          </div>
        </section>

        {org.note && <p className="whitespace-pre-line rounded-md bg-slate-50 p-4 text-sm text-slate-600">{org.note}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
          <button
            type="button" className="text-sm text-slate-500 hover:underline"
            onClick={() => { if (confirm("¿Borrar todo lo que escribiste?")) { setClearedAt(result.attempt); setResetKey((k) => k + 1); } }}
          >
            Borrar formulario
          </button>
          <button type="submit" disabled={pending} className="rounded-md px-6 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60" style={{ backgroundColor: color }}>
            {pending ? "Enviando…" : "Enviar solicitud"}
          </button>
        </div>
        {Object.keys(e).length > 0 && !pending && (
          <p role="alert" className="text-right text-sm text-red-700">Revisa los campos marcados en rojo.</p>
        )}
      </div>
    </form>
  );
}

function TypeSection({ org, types, state, ring }: { org: Props["org"]; types: string[]; state: FormState; ring: React.CSSProperties }) {
  const [selected, setSelected] = useState(state.values.type ?? "");
  const e = state.errors;
  const color = org.themeColor;
  const option = (value: string, label: string, extraCls = "") => {
    const active = selected === value;
    return (
      <label
        key={value}
        className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${active ? "font-medium" : "border-slate-300 hover:bg-slate-50"} ${extraCls}`}
        style={active ? { borderColor: color, backgroundColor: `${color}14` } : undefined}
      >
        <input type="radio" name="type" value={value} defaultChecked={state.values.type === value} onChange={() => setSelected(value)} className="h-4 w-4" style={{ accentColor: color }} />
        {label}
      </label>
    );
  };
  return (
    <fieldset aria-describedby={e.type ? "type-error" : undefined}>
      <legend className="mb-2 text-lg font-semibold">Tipo de solicitud <span className="text-red-600">*</span></legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {types.map((t) => option(t, t))}
        {org.allowOtherType && option(OTHER, "Mi problema no está en la lista", "sm:col-span-2 border-dashed")}
      </div>
      <FieldError id="type" msg={e.type} />
      {org.allowOtherType && selected === OTHER && (
        <div className="mt-3">
          <label htmlFor="typeOther" className="mb-1 block text-sm font-medium">¿De qué tipo es tu problema? <span className="text-red-600">*</span></label>
          <input
            id="typeOther" name="typeOther" defaultValue={state.values.typeOther} autoFocus maxLength={120}
            placeholder="Ej. Problema con la impresora, alta de usuario, licencia de software…"
            aria-invalid={!!e.typeOther} aria-describedby={e.typeOther ? "typeOther-error" : undefined}
            className={`${inputCls} ${e.typeOther ? "border-red-600" : "border-slate-300"}`} style={ring}
          />
          <FieldError id="typeOther" msg={e.typeOther} />
        </div>
      )}
    </fieldset>
  );
}

function Field({ id, label, required, error, help, children }: { id: string; label: string; required?: boolean; error?: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label} {required && <span className="text-red-600">*</span>} {help && <span className="font-normal text-slate-500">· {help}</span>}
      </label>
      {children}
      <FieldError id={id} msg={error} />
    </div>
  );
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-700">{msg}</p>;
}

function Success({ org, folio, token }: { org: Props["org"]; folio: number; token: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/seguimiento/${token}` : `/seguimiento/${token}`;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="h-2" style={{ backgroundColor: org.themeColor }} />
      <div className="space-y-4 p-8 text-center">
        <div className="text-4xl" aria-hidden>✅</div>
        <h1 className="text-2xl font-semibold">Recibimos tu solicitud</h1>
        <div>
          <p className="text-sm text-slate-500">ID de tu solicitud</p>
          <p className="font-mono text-3xl font-bold tracking-wide">{ticketCode(folio)}</p>
          <p className="text-xs text-slate-500">Anótalo: lo necesitarás para dar seguimiento.</p>
        </div>
        <div className="rounded-md bg-slate-50 p-4 text-left text-sm">
          <p className="mb-2 font-medium">Guarda este enlace para ver el avance y responder al equipo:</p>
          <div className="flex gap-2">
            <input readOnly value={url} aria-label="Enlace de seguimiento" className="flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))} className="rounded border border-slate-300 bg-white px-3 text-xs hover:bg-slate-100">
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">También puedes consultarlo en “Seguimiento” con tu ID y tu correo.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <Link href={`/seguimiento/${token}`} className="rounded-md px-4 py-2 font-medium text-white" style={{ backgroundColor: org.themeColor }}>Ver mi solicitud</Link>
          <button type="button" onClick={() => location.reload()} className="rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50">Enviar otra</button>
          <Link href="/" className="rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50">Ver tablero</Link>
        </div>
      </div>
    </div>
  );
}
