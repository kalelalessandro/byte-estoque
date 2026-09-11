#!/bin/sh
# Backup logico do Postgres do ByteForce. Requer DATABASE_URL e pg_dump no PATH.
# Uso: DATABASE_URL=... ./scripts/backup.sh [dir]
set -e
: "${DATABASE_URL:?defina DATABASE_URL}"
DIR="${1:-./backups}"; mkdir -p "$DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DIR/byteforce-$STAMP.dump"
echo "==> pg_dump -> $OUT"
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" -f "$OUT"
echo "OK: $OUT"
