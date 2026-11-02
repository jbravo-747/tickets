# Mesa de ayuda (tickets)

Sistema de solicitudes de soporte con Next.js 15, Prisma y PostgreSQL.

- **`/`**: tablero público con la pila de solicitudes abiertas ordenadas por prioridad, el resumen por prioridad y un calendario de fechas de entrega. Se actualiza cada minuto y no muestra datos personales.
- **`/solicitud/<organizacion>`**: formulario público. Primero pide la descripción del problema, luego el tipo (con la opción "Mi problema no está en la lista"), la evidencia (archivos) y los datos de contacto.
- **`/seguimiento`**: el solicitante consulta su ticket con el **ID** (`T-00012`) y su correo, o con el enlace privado `/seguimiento/<token>` que recibe al enviarlo. Ahí ve el estado, la conversación y puede responder con más archivos.
- **`/admin`**: administración protegida con contraseña:
  - pila de tickets: indicadores por severidad, filtros (pendientes de respuesta, vencidos) y cambio rápido de estado;
  - calendario de entregas: filtros por prioridad, cumplimiento de fechas, tickets vencidos, compromisos del día y reprogramación con motivo;
  - hilo de cada ticket: respuestas al solicitante y notas internas, con archivos adjuntos; cada cambio de estado, prioridad o fecha queda registrado en el hilo;
  - organizaciones: alta, textos del formulario, color, áreas, tipos de solicitud y campos adicionales.

## Diseño

La interfaz sigue la guía **"Executive Service Operations"** (estilo de consola ITSM):
- **Colores**: primario cobalto `#1d4ed8`; severidades P1 rojo, P2 ámbar, P3 cobalto y P4 verde. El color se usa solo para comunicar estado.
- **Tipografía**: Geist para títulos, etiquetas e IDs; Inter para textos; números tabulares.
- **Formas**: radio de 4 px en controles y 8 px en paneles, sin píldoras salvo en contadores, y bordes finos en lugar de sombras.
- **Íconos**: Material Symbols. Solo se descargan los listados en `src/components/Icon.tsx`.

Los tokens y las clases de componentes (`btn`, `input`, `badge`, `panel`, `data-table`…) están en `src/app/globals.css`.

## Arranque local

```bash
cp .env.example .env        # ajusta ADMIN_PASSWORD y SESSION_SECRET
npm install
npm run db:up               # PostgreSQL en Docker (puerto 5433)
npm run db:migrate          # aplica migraciones
npm run db:seed             # organización "demo" de ejemplo
npm run dev                 # http://localhost:3000
```

## Modelo

`Organization` → `Area`, `RequestType` y `TicketField` (catálogos y preguntas configurables) → `Ticket` → `Message` (hilo) y `Attachment` (evidencia).

Cada ticket tiene un **ID visible** derivado de su folio (`T-00012`) para seguimiento.

## Evidencia (Vercel Blob)

Los archivos se suben **directo del navegador a Vercel Blob** (`/api/upload` emite un token de un solo uso), así que no aplica el límite de 4.5 MB de las funciones. El almacén es **privado**: los archivos solo se sirven por `/api/archivos/<id>` a una sesión de admin o al solicitante con su token (nunca los de notas internas). Límite: 10 archivos de 25 MB; tipos permitidos en `src/lib/constants.ts`.

Requiere `BLOB_READ_WRITE_TOKEN`. En local, ponlo en `.env.local` (solo esa variable; no copies `DATABASE_URL` de producción ahí, porque `.env.local` tiene prioridad sobre `.env`).
El área y el tipo se guardan como texto en el ticket, así que editar los catálogos no altera el historial.

## Despliegue en Vercel

1. Crea una base PostgreSQL: Neon desde el Marketplace de Vercel (Storage → Neon) o cualquier Postgres administrado.
2. Importa el repositorio en Vercel. El framework se detecta solo y Vercel usa el script `vercel-build`, que genera el cliente de Prisma, aplica las migraciones (`prisma migrate deploy`) y compila.
3. Configura las variables de entorno (Production y Preview):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | URL **con pooling** (en Neon, la que tiene `-pooler` en el host) |
   | `DIRECT_URL` | URL **directa**, sin pooler (para migraciones). Opcional con la integración de Neon: se toma de `DATABASE_URL_UNPOOLED` |
   | `ADMIN_PASSWORD` | contraseña de `/admin` |
   | `SESSION_SECRET` | resultado de `openssl rand -hex 32` |
   | `BLOB_READ_WRITE_TOKEN` | se crea al conectar un Blob store privado (`vercel blob create-store <nombre> --access private`) |

4. Opcional: carga datos de ejemplo con `DATABASE_URL=... DIRECT_URL=... npm run db:seed`.

> Si los *Preview deployments* comparten la base de producción, cada preview aplicará las migraciones pendientes en esa base. Para evitarlo, usa una base o rama de Neon distinta para Preview.
>
> Elige para las funciones (Settings → Functions → Region) la misma región que la base de datos para reducir la latencia.
