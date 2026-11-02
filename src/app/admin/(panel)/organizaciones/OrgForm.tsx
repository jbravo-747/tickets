"use client";

import { useActionState } from "react";
import { Icon } from "@/components/Icon";

type Org = { name: string; slug: string; intro: string; note: string; themeColor: string; active: boolean; allowOtherType: boolean };

export function OrgForm({ action, org, submitLabel }: {
  action: (prev: string | null, fd: FormData) => Promise<string | null>;
  org?: Org;
  submitLabel: string;
}) {
  const [msg, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Nombre *</span>
          <input name="name" required defaultValue={org?.name} className="input w-full" />
        </label>
        <label className="block">
          <span className="field-label">Identificador en la URL</span>
          <div className="flex items-center rounded border border-line-strong focus-within:border-primary focus-within:shadow-[0_0_0_1px_#1d4ed8]">
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
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2">
          <span className="field-label !mb-0">Color de identidad</span>
          <input type="color" name="themeColor" defaultValue={org?.themeColor ?? "#1d4ed8"} className="h-8 w-12 cursor-pointer rounded border border-line-strong bg-white p-0.5" />
        </label>
        {org && (
          <>
            <label className="flex items-center gap-2"><input type="checkbox" name="allowOtherType" defaultChecked={org.allowOtherType} /> Permitir “Mi problema no está en la lista”</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={org.active} /> Activa (visible al público)</label>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 border-t border-[#f1f5f9] pt-4">
        <button disabled={pending} className="btn btn-primary btn-lg">{submitLabel}</button>
        {msg && (msg === "Guardado."
          ? <p role="status" className="flex items-center gap-1 text-[12px] text-[#15803d]"><Icon name="check_circle" size={14} />Guardado.</p>
          : <p role="alert" className="text-[12px] text-[#b91c1c]">{msg}</p>)}
      </div>
    </form>
  );
}
