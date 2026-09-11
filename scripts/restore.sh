#!/bin/sh
# Restauracao do Postgres do ByteForce. Requer DATABASE_URL e pg_restore no PATH.
# Uso: DATABASE_URL=... ./scripts/restore.sh caminho/arquivo.dump
set -e
: "${DATABASE_URL:?defina DATABASE_URL}"
FILE="${1:?informe o arquivo .dump}"
echo "==> pg_restore <- $FILE (clean)"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$DATABASE_URL" "$FILE"
echo "OK. Reaplique as policies: npm run db:rls"
