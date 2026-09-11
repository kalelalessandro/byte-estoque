import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Executa `fn` dentro de uma transacao com a variavel de sessao Postgres
 * `app.current_tenant_id` definida para o tenant informado. As policies de RLS
 * (sql/rls.sql) leem essa variavel, entao TODAS as queries feitas atraves do
 * `tx` recebido ficam automaticamente restritas ao tenant.
 *
 * set_config(nome, valor, is_local=true) => escopo da transacao (SET LOCAL).
 *
 * Regra de ouro: `tenantId` sempre vem da sessao autenticada no servidor
 * (ver src/lib/session.ts), NUNCA de um id enviado pelo cliente.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}

/**
 * Contexto de PLATAFORMA: seta app.platform='on', habilitando o bypass de RLS
 * SOMENTE nas tabelas administrativas (ver sql/rls.sql, grupo B). Tabelas
 * operacionais permanecem inacessiveis. Chamar apenas apos requirePlatformAdmin().
 */
export async function withPlatform<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.platform', 'on', true)`;
    return fn(tx);
  });
}
