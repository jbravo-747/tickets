import type { IconName } from "@/components/Icon";

/** Ícono y descripción breve para los tipos de solicitud más comunes (los demás usan un ícono genérico). */
const RULES: { test: RegExp; icon: IconName; hint: string }[] = [
  { test: /externo|proveedor/i, icon: "groups", hint: "Proveedores y consultoría" },
  { test: /desarroll/i, icon: "code", hint: "Nuevas funciones o sistemas" },
  { test: /actualiz/i, icon: "upgrade", hint: "Versiones, parches y contenidos" },
  { test: /infraestructura|servidor|red/i, icon: "dns", hint: "Servidores, redes y almacenamiento" },
  { test: /mantenimiento/i, icon: "build", hint: "Preventivo y correctivo" },
  { test: /soporte/i, icon: "support_agent", hint: "Equipos, accesos y software" },
];

export function requestTypeMeta(name: string): { icon: IconName; hint?: string } {
  const r = RULES.find((x) => x.test.test(name));
  return r ? { icon: r.icon, hint: r.hint } : { icon: "label" };
}
