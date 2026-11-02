import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FIELD_TYPE_LABEL, logoUrl } from "@/lib/constants";
import { Breadcrumb, PageTitle } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
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
    <div className="space-y-5">
      <Breadcrumb items={[{ label: "Organizaciones", href: "/admin/organizaciones", icon: "domain" }, { label: org.name }]} />
      <PageTitle
        title={<span className="flex items-center gap-2.5"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: org.themeColor }} aria-hidden />{org.name}</span>}
        subtitle="Textos, catálogos y preguntas del formulario público."
        actions={<Link href={`/solicitud/${org.slug}`} target="_blank" className="btn btn-secondary"><Icon name="open_in_new" size={16} />Ver formulario</Link>}
      />

      <section className="panel">
        <div className="panel-header"><span className="flex items-center gap-1.5"><Icon name="description" size={16} className="text-primary-ink" />Datos y textos</span></div>
        <OrgForm action={updateOrganization.bind(null, org.id)} org={org} logoUrl={logoUrl(org)} submitLabel="Guardar" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Catalog title="Áreas" kind="area" orgId={org.id} items={org.areas} />
        <Catalog title="Tipos de solicitud" kind="type" orgId={org.id} items={org.requestTypes} />
      </div>

      <section className="panel">
        <div className="panel-header">
          <span className="flex items-center gap-1.5"><Icon name="tag" size={16} className="text-primary-ink" />Campos adicionales del ticket</span>
          <span className="counter">{org.fields.length}</span>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-steel">Siempre se piden: descripción, tipo de solicitud, evidencia (opcional), nombre, correo, área y fecha tentativa. Aquí puedes agregar más preguntas.</p>
          {org.fields.length > 0 && (
            <table className="data-table rounded border border-line">
              <thead><tr><th>Pregunta</th><th className="w-48">Tipo</th><th className="w-72 text-right">Acciones</th></tr></thead>
              <tbody>
                {org.fields.map((f, i) => (
                  <tr key={f.id}>
                    <td><span className="font-medium">{f.label}</span> {f.required && <span className="ml-1 text-[12px] text-muted">· obligatoria</span>}</td>
                    <td className="text-[12px] text-steel">{FIELD_TYPE_LABEL[f.type]}{f.options.length > 0 && `: ${f.options.join(", ")}`}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <form action={moveField.bind(null, f.id, org.id, -1)}><button disabled={i === 0} aria-label="Subir" className="btn btn-secondary h-7 px-2">↑</button></form>
                        <form action={moveField.bind(null, f.id, org.id, 1)}><button disabled={i === org.fields.length - 1} aria-label="Bajar" className="btn btn-secondary h-7 px-2">↓</button></form>
                        <form action={toggleFieldRequired.bind(null, f.id, org.id)}><button className="btn btn-secondary h-7 px-2 text-[12px]">{f.required ? "Hacer opcional" : "Hacer obligatoria"}</button></form>
                        <form action={deleteField.bind(null, f.id, org.id)}><button className="btn btn-danger h-7 px-2 text-[12px]">Eliminar</button></form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form action={addField.bind(null, org.id)} className="grid gap-3 rounded border border-dashed border-line-strong bg-canvas p-4 sm:grid-cols-2">
            <label className="block"><span className="field-label">Pregunta *</span><input name="label" required className="input w-full" /></label>
            <label className="block">
              <span className="field-label">Tipo</span>
              <select name="type" className="input w-full">{Object.entries(FIELD_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <label className="block sm:col-span-2"><span className="field-label">Opciones (solo lista desplegable, una por línea)</span><textarea name="options" rows={3} className="input w-full" /></label>
            <label className="flex items-center gap-2"><input type="checkbox" name="required" /> Obligatoria</label>
            <div className="sm:text-right"><button className="btn btn-primary"><Icon name="add" size={16} />Agregar campo</button></div>
          </form>
        </div>
      </section>
    </div>
  );
}

function Catalog({ title, kind, orgId, items }: { title: string; kind: "area" | "type"; orgId: string; items: { id: string; name: string }[] }) {
  return (
    <section className="panel">
      <div className="panel-header"><span>{title}</span><span className="counter">{items.length}</span></div>
      <div className="space-y-3 p-4">
        <ul className="divide-y divide-subtle rounded border border-line">
          {items.map((it) => (
            <li key={it.id} className="flex h-9 items-center justify-between pl-3 pr-1">
              {it.name}
              <form action={deleteCatalogItem.bind(null, kind, it.id, orgId)}>
                <button className="btn-icon hover:!text-danger" aria-label={`Quitar ${it.name}`}><Icon name="close" size={16} /></button>
              </form>
            </li>
          ))}
          {items.length === 0 && <li className="p-3 text-muted">Vacío: agrega al menos una opción.</li>}
        </ul>
        <form action={addCatalogItem.bind(null, kind, orgId)} className="flex gap-2">
          <input name="name" required placeholder="Nueva opción" aria-label={`Nueva opción de ${title}`} className="input flex-1" />
          <button className="btn btn-primary"><Icon name="add" size={16} />Agregar</button>
        </form>
      </div>
    </section>
  );
}
