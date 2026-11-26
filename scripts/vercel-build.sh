#!/bin/sh
# Build auf Vercel. Nimmt DATABASE_URL, sonst die Variablen der Vercel-Supabase-Integration.
set -e
export DATABASE_URL="${DATABASE_URL:-${POSTGRES_URL_NON_POOLING:-$POSTGRES_PRISMA_URL}}"
if [ -z "$DATABASE_URL" ]; then
  echo "Keine Datenbank konfiguriert: DATABASE_URL oder Supabase-Integration fehlt." >&2
  exit 1
fi
npx prisma migrate deploy
npx prisma db seed
npx next build
