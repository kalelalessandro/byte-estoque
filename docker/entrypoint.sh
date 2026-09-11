#!/bin/sh
set -e
echo "==> Sincronizando schema (prisma db push)..."
npx prisma db push --skip-generate
echo "==> Aplicando policies de RLS..."
npx prisma db execute --file ./sql/rls.sql --schema ./prisma/schema.prisma
echo "==> Iniciando Byte Force..."
exec node server.js
