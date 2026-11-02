"use client";

import { useActionState } from "react";

type Org = { name: string; slug: string; intro: string; note: string; themeColor: string; active: boolean; allowOtherType: boolean };

export function OrgForm({ action, org, submitLabel }: {
  action: (prev: string | null, fd: FormData) => Promise<string | null>;
  org?: Org;
  submitLabel: string;
}) {
  const [msg, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-slate-600">Nombre *</span>
          <input name="name" required defaultValue={org?.name} className="w-full rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="block">
          <span className="mb-1 block text-slate-600">Identificador en la URL</span>
          <input name="slug" defaultValue={org?.slug} placeholder="se genera del nombre" className="w-full rounded border border-slate-300 px-3 py-2 font-mono" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-slate-600">Texto de introducción del formulario</span>
        <textarea name="intro" rows={3} defaultValue={org?.intro} className="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="block">
        <span className="mb-1 block text-slate-600">Nota al final del formulario</span>
        <textarea name="note" rows={2} defaultValue={org?.note} className="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2">
          <span className="text-slate-600">Color</span>
          <input type="color" name="themeColor" defaultValue={org?.themeColor ?? "#5f7593"} className="h-8 w-12" />
        </label>
        {org && (
          <>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="allowOtherType" defaultChecked={org.allowOtherType} /> Permitir “Otro” en tipo de solicitud
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="active" defaultChecked={org.active} /> Activa (visible al público)
            </label>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-60">{submitLabel}</button>
        {msg && <p role="status" className={msg === "Guardado." ? "text-emerald-700" : "text-red-700"}>{msg}</p>}
      </div>
    </form>
  );
}
