#!/bin/sh
# Build para Vercel. La integración de Neon crea DATABASE_URL (con pooler) y
# DATABASE_URL_UNPOOLED (directa); Prisma espera DIRECT_URL para las migraciones.
set -e

if [ -z "$DIRECT_URL" ]; then
  if [ -n "$DATABASE_URL_UNPOOLED" ]; then
    DIRECT_URL="$DATABASE_URL_UNPOOLED"
  elif [ -n "$POSTGRES_URL_NON_POOLING" ]; then
    DIRECT_URL="$POSTGRES_URL_NON_POOLING"
  else
    DIRECT_URL="$DATABASE_URL"
  fi
  export DIRECT_URL
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Falta DATABASE_URL: configura la base de datos en Vercel (Storage → Neon)." >&2
  exit 1
fi

npx prisma generate
npx prisma migrate deploy
npx next build
