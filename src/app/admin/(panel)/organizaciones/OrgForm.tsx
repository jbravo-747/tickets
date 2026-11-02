"use client";

import { useActionState, useState } from "react";
import { accentVars } from "@/lib/accent";
import { LogoField } from "./LogoField";
import { Icon } from "@/components/Icon";

type Org = { name: string; slug: string; intro: string; note: string; themeColor: string; active: boolean; allowOtherType: boolean };

export function OrgForm({ action, org, submitLabel, logoUrl }: {
  action: (prev: string | null, fd: FormData) => Promise<string | null>;
  org?: Org;
  submitLabel: string;
  logoUrl?: string | null;
}) {
  const [msg, formAction, pending] = useActionState(action, null);
  const [color, setColor] = useState(org?.themeColor ?? "#1d4ed8");
  return (
    <form action={formAction} className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Nombre *</span>
          <input name="name" required defaultValue={org?.name} className="input w-full" />
        </label>
        <label className="block">
          <span className="field-label">Identificador en la URL</span>
          <div className="flex items-center rounded border border-line-strong focus-ring">
            <span className="pl-2 font-mono text-[12px] text-muted">/solicitud/</span>
            <input name="slug" defaultValue={org?.slug} placeholder="se genera del nombre" className="h-8 w-full bg-transparent pr-2 font-mono text-[13px] outline-none" />
          </div>
        </label>
      </div>
      <label className="block">
        <span className="field-label">Texto de introducción del formulario</span>
        <textarea name="intro" rows={3} defaultValue={org?.intro} className="input w-full" />
      </label>
      <label className="block">
        <span className="field-label">Nota al final del formulario</span>
        <textarea name="note" rows={2} defaultValue={org?.note} className="input w-full" />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <span className="field-label">Color de la organización</span>
          <div className="flex items-center gap-3">
            <input type="color" name="themeColor" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Color de la organización" className="h-9 w-12 cursor-pointer rounded-md border border-line-strong bg-white p-0.5" />
            <span className="font-mono text-[12px] text-steel">{color.toUpperCase()}</span>
            {/* Vista previa con los tonos accesibles que se derivan del color */}
            <span className="accent-scope flex items-center gap-2" style={accentVars(color) as React.CSSProperties}>
              <span className="btn btn-primary pointer-events-none h-7 px-2.5 text-[12px]">Botón</span>
              <span className="text-[12px] font-medium text-primary-ink">Enlace</span>
            </span>
          </div>
          <p className="mt-1 text-[12px] text-muted">Se usa como acento en el formulario, el seguimiento y el tablero.</p>
        </div>
        {org && <LogoField currentUrl={logoUrl ?? null} />}
      </div>
      {org && (
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2"><input type="checkbox" name="allowOtherType" defaultChecked={org.allowOtherType} /> Permitir “Mi problema no está en la lista”</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={org.active} /> Activa (visible al público)</label>
        </div>
      )}
      <div className="flex items-center gap-3 border-t border-subtle pt-4">
        <button disabled={pending} className="btn btn-primary btn-lg">{submitLabel}</button>
        {msg && (msg === "Guardado."
          ? <p role="status" className="flex items-center gap-1 text-[12px] text-ok"><Icon name="check_circle" size={14} />Guardado.</p>
          : <p role="alert" className="text-[12px] text-danger">{msg}</p>)}
      </div>
    </form>
  );
}
