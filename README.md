# Mesa de ayuda (tickets)

Sistema de solicitudes de soporte con Next.js 15, Prisma y PostgreSQL.

- **`/`**: tablero público con la pila de solicitudes abiertas ordenadas por prioridad, el resumen por prioridad y un calendario de fechas de entrega. Se actualiza cada minuto y no muestra datos personales.
- **`/solicitud/<organizacion>`**: formulario público para levantar una solicitud.
- **`/admin`**: administración protegida con contraseña:
  - tickets: filtros, prioridad, estado, fecha de entrega y notas internas;
  - organizaciones: alta, textos del formulario, color, áreas, tipos de solicitud y campos adicionales.

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

`Organization` → `Area`, `RequestType` y `TicketField` (catálogos y preguntas configurables) → `Ticket` → `Comment`.
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

4. Opcional: carga datos de ejemplo con `DATABASE_URL=... DIRECT_URL=... npm run db:seed`.

> Si los *Preview deployments* comparten la base de producción, cada preview aplicará las migraciones pendientes en esa base. Para evitarlo, usa una base o rama de Neon distinta para Preview.
>
> Elige para las funciones (Settings → Functions → Region) la misma región que la base de datos para reducir la latencia.
