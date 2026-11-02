import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FIELD_TYPE_LABEL } from "@/lib/constants";
import { addCatalogItem, addField, deleteCatalogItem, deleteField, moveField, toggleFieldRequired, updateOrganization } from "../../../actions";
import { OrgForm } from "../OrgForm";

export const dynamic = "force-dynamic";

export default async function OrganizacionDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      areas: { orderBy: [{ order: "asc" }, { name: "asc" }] },
      requestTypes: { orderBy: [{ order: "asc" }, { name: "asc" }] },
      fields: { orderBy: { order: "asc" } },
    },
  });
  if (!org) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/organizaciones" className="text-sm text-slate-600 hover:underline">← Organizaciones</Link>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">{org.name}</h1>
        <Link href={`/solicitud/${org.slug}`} target="_blank" className="text-sm text-blue-700 hover:underline">Ver formulario público ↗</Link>
      </div>

      <OrgForm action={updateOrganization.bind(null, org.id)} org={org} submitLabel="Guardar" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Catalog title="Áreas" kind="area" orgId={org.id} items={org.areas} />
        <Catalog title="Tipos de solicitud" kind="type" orgId={org.id} items={org.requestTypes} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm">
        <h2 className="mb-1 text-lg font-semibold">Campos adicionales del ticket</h2>
        <p className="mb-4 text-slate-500">
          Siempre se piden: correo, nombre, área, tipo de solicitud, descripción y fecha tentativa. Aquí puedes agregar más preguntas.
        </p>
        <ul className="mb-5 divide-y divide-slate-100 rounded border border-slate-200">
          {org.fields.map((f, i) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <span className="font-medium">{f.label}</span> {f.required && <span className="text-red-700">*</span>}
                <div className="text-xs text-slate-500">
                  {FIELD_TYPE_LABEL[f.type]}{f.options.length > 0 && `: ${f.options.join(", ")}`}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <form action={moveField.bind(null, f.id, org.id, -1)}><button disabled={i === 0} aria-label="Subir" className="rounded border px-2 py-1 disabled:opacity-30">↑</button></form>
                <form action={moveField.bind(null, f.id, org.id, 1)}><button disabled={i === org.fields.length - 1} aria-label="Bajar" className="rounded border px-2 py-1 disabled:opacity-30">↓</button></form>
                <form action={toggleFieldRequired.bind(null, f.id, org.id)}>
                  <button className="rounded border px-2 py-1">{f.required ? "Hacer opcional" : "Hacer obligatorio"}</button>
                </form>
                <form action={deleteField.bind(null, f.id, org.id)}>
                  <button className="rounded border border-red-200 px-2 py-1 text-red-700">Eliminar</button>
                </form>
              </div>
            </li>
          ))}
          {org.fields.length === 0 && <li className="p-3 text-slate-500">Sin campos adicionales.</li>}
        </ul>
        <form action={addField.bind(null, org.id)} className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-slate-600">Pregunta *</span>
            <input name="label" required className="w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-slate-600">Tipo</span>
            <select name="type" className="w-full rounded border border-slate-300 px-3 py-2">
              {Object.entries(FIELD_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-slate-600">Opciones (solo lista desplegable, una por línea)</span>
            <textarea name="options" rows={3} className="w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" name="required" /> Obligatoria</label>
          <div className="sm:text-right"><button className="rounded bg-slate-800 px-4 py-2 text-white">Agregar campo</button></div>
        </form>
      </section>
    </div>
  );
}

function Catalog({ title, kind, orgId, items }: { title: string; kind: "area" | "type"; orgId: string; items: { id: string; name: string }[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <ul className="mb-3 divide-y divide-slate-100 rounded border border-slate-200">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between p-2 pl-3">
            {it.name}
            <form action={deleteCatalogItem.bind(null, kind, it.id, orgId)}>
              <button className="text-xs text-red-700 hover:underline">Quitar</button>
            </form>
          </li>
        ))}
        {items.length === 0 && <li className="p-3 text-slate-500">Vacío: agrega al menos una opción.</li>}
      </ul>
      <form action={addCatalogItem.bind(null, kind, orgId)} className="flex gap-2">
        <input name="name" required placeholder="Nueva opción" aria-label={`Nueva opción de ${title}`} className="flex-1 rounded border border-slate-300 px-3 py-1.5" />
        <button className="rounded bg-slate-800 px-3 py-1.5 text-white">Agregar</button>
      </form>
    </section>
  );
}
