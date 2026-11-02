"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FieldType } from "@prisma/client";
import { submitTicket, type FormState } from "./actions";
import { OTHER } from "@/lib/constants";

type Props = {
  org: { id: string; name: string; intro: string; note: string; themeColor: string; allowOtherType: boolean };
  areas: string[];
  types: string[];
  fields: { id: string; label: string; type: FieldType; options: string[]; required: boolean }[];
};

const initial: FormState = { attempt: 0, errors: {}, values: {} };

export function TicketForm({ org, areas, types, fields }: Props) {
  const [result, action, pending] = useActionState(submitTicket.bind(null, org.id), initial);
  // Intento en el que se usó "Borrar formulario": descarta los valores devueltos por ese intento.
  const [clearedAt, setClearedAt] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const state: FormState = clearedAt === result.attempt ? { ...result, values: {}, errors: {} } : result;

  if (state.ok) {
    return (
      <Card color={org.themeColor} top>
        <h1 className="text-2xl">{org.name}</h1>
        <p className="mt-3">Se registró tu solicitud con el folio <strong className="font-mono">#{state.folio}</strong>.</p>
        <p className="mt-1 text-sm text-slate-600">Puedes seguir su avance en el tablero.</p>
        <div className="mt-4 flex gap-4 text-sm">
          <button type="button" onClick={() => location.reload()} className="underline" style={{ color: org.themeColor }}>
            Enviar otra solicitud
          </button>
          <Link href="/" className="underline" style={{ color: org.themeColor }}>Ver tablero</Link>
        </div>
      </Card>
    );
  }

  return (
    // La key fuerza a montar de nuevo el formulario con los valores devueltos por el servidor.
    <form key={`${state.attempt}-${resetKey}`} action={action} noValidate className="space-y-3">
      <Card color={org.themeColor} top>
        <h1 className="text-3xl">{org.name}</h1>
        {org.intro && <p className="mt-3 whitespace-pre-line text-sm">{org.intro}</p>}
        <hr className="my-4 border-slate-200" />
        <p className="text-sm text-red-700">* Indica que la pregunta es obligatoria</p>
        {state.errors._form && <p role="alert" className="mt-2 text-sm text-red-700">{state.errors._form}</p>}
      </Card>

      <Question id="email" label="Correo electrónico" required error={state.errors.email}>
        <LineInput id="email" name="email" type="email" autoComplete="email" defaultValue={state.values.email} error={state.errors.email} color={org.themeColor} />
      </Question>

      <Question id="name" label="Nombre de la persona que lo solicita" required error={state.errors.name}>
        <LineInput id="name" name="name" autoComplete="name" defaultValue={state.values.name} error={state.errors.name} color={org.themeColor} />
      </Question>

      <Question id="area" label="Área" required error={state.errors.area}>
        <Select id="area" name="area" options={areas} defaultValue={state.values.area} error={state.errors.area} />
      </Question>

      <TypeQuestion org={org} types={types} state={state} />

      <Question id="description" label="Describe el proyecto o actividad solicitada" required error={state.errors.description}>
        <LineInput id="description" name="description" full defaultValue={state.values.description} error={state.errors.description} color={org.themeColor} />
      </Question>

      <Question id="dueDate" label="Fecha tentativa de entrega" error={state.errors.dueDate}>
        <input id="dueDate" name="dueDate" type="date" defaultValue={state.values.dueDate} aria-invalid={!!state.errors.dueDate}
          aria-describedby={state.errors.dueDate ? "dueDate-error" : undefined}
          className="rounded border border-slate-300 px-3 py-2 text-sm" />
      </Question>

      {fields.map((f) => {
        const name = `f_${f.id}`;
        const err = state.errors[name];
        return (
          <Question key={f.id} id={name} label={f.label} required={f.required} error={err}>
            {f.type === "SELECT" ? (
              <Select id={name} name={name} options={f.options} defaultValue={state.values[name]} error={err} />
            ) : f.type === "TEXTAREA" ? (
              <textarea id={name} name={name} rows={3} defaultValue={state.values[name]} aria-invalid={!!err}
                aria-describedby={err ? `${name}-error` : undefined}
                className="w-full border-b border-slate-300 bg-transparent py-1 text-sm outline-none focus:border-b-2" style={{ borderColor: err ? "#b91c1c" : undefined }} />
            ) : f.type === "DATE" ? (
              <input id={name} name={name} type="date" defaultValue={state.values[name]} aria-invalid={!!err} className="rounded border border-slate-300 px-3 py-2 text-sm" />
            ) : (
              <LineInput id={name} name={name} type={f.type === "NUMBER" ? "number" : "text"} full={f.type === "TEXT"} defaultValue={state.values[name]} error={err} color={org.themeColor} />
            )}
          </Question>
        );
      })}

      {org.note && (
        <Card>
          <p className="whitespace-pre-line">{org.note}</p>
        </Card>
      )}

      <div className="flex items-center justify-between pt-1">
        <button type="submit" disabled={pending} className="rounded px-6 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: org.themeColor }}>
          {pending ? "Enviando…" : "Enviar"}
        </button>
        <button type="button" className="text-sm font-medium" style={{ color: org.themeColor }}
          onClick={() => {
            if (confirm("¿Borrar todas las respuestas del formulario?")) {
              setClearedAt(result.attempt);
              setResetKey((k) => k + 1);
            }
          }}>
          Borrar formulario
        </button>
      </div>
    </form>
  );
}

function TypeQuestion({ org, types, state }: { org: Props["org"]; types: string[]; state: FormState }) {
  const [selected, setSelected] = useState(state.values.type ?? "");
  const err = state.errors.type;
  return (
    <fieldset aria-describedby={err ? "type-error" : undefined} className={`rounded-lg border bg-white p-6 ${err ? "border-red-700" : "border-slate-300"}`}>
      <legend className="sr-only">Tipo de solicitud</legend>
      <p aria-hidden className="mb-4">Tipo de solicitud <span className="text-red-700">*</span></p>
      <div className="space-y-3 text-sm">
        {types.map((t) => (
          <label key={t} className="flex cursor-pointer items-center gap-3">
            <input type="radio" name="type" value={t} defaultChecked={state.values.type === t} onChange={() => setSelected(t)} className="h-5 w-5" style={{ accentColor: org.themeColor }} />
            {t}
          </label>
        ))}
        {org.allowOtherType && (
          <div className="flex items-center gap-3">
            <input id="type-other" type="radio" name="type" value={OTHER} defaultChecked={state.values.type === OTHER} onChange={() => setSelected(OTHER)} className="h-5 w-5" style={{ accentColor: org.themeColor }} />
            <label htmlFor="type-other">Otro:</label>
            <input name="typeOther" aria-label="Especifica otro tipo de solicitud" defaultValue={state.values.typeOther}
              onFocus={() => { (document.getElementById("type-other") as HTMLInputElement).checked = true; setSelected(OTHER); }}
              required={selected === OTHER}
              className="flex-1 border-b border-slate-300 bg-transparent py-1 outline-none focus:border-b-2" />
          </div>
        )}
      </div>
      {err && <ErrorText id="type-error">{err}</ErrorText>}
    </fieldset>
  );
}

function Card({ children, color, top }: { children: React.ReactNode; color?: string; top?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
      {top && <div className="h-2.5" style={{ backgroundColor: color }} />}
      <div className="p-6">{children}</div>
    </div>
  );
}

function Question({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border bg-white p-6 ${error ? "border-red-700" : "border-slate-300"}`}>
      <label htmlFor={id} className="mb-4 block">
        {label} {required && <span className="text-red-700" aria-label="obligatoria">*</span>}
      </label>
      {children}
      {error && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
    </div>
  );
}

function ErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-3 flex items-center gap-2 text-sm text-red-700">
      <span aria-hidden>ⓘ</span>
      {children}
    </p>
  );
}

function LineInput({ error, full, color, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string; full?: boolean; color: string }) {
  return (
    <input
      {...props}
      placeholder="Tu respuesta"
      aria-invalid={!!error}
      aria-describedby={error ? `${props.id}-error` : undefined}
      className={`${full ? "w-full" : "w-full sm:w-1/2"} border-b bg-transparent py-1 text-sm outline-none focus:border-b-2 ${error ? "border-red-700" : "border-slate-300"}`}
      onFocus={(e) => (e.currentTarget.style.borderBottomColor = error ? "" : color)}
      onBlur={(e) => (e.currentTarget.style.borderBottomColor = "")}
    />
  );
}

function Select({ id, name, options, defaultValue, error }: { id: string; name: string; options: string[]; defaultValue?: string; error?: string }) {
  return (
    <select id={id} name={name} defaultValue={defaultValue ?? ""} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
      className={`w-56 rounded border bg-white px-3 py-2 text-sm ${error ? "border-red-700" : "border-slate-300"}`}>
      <option value="">Elegir</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
