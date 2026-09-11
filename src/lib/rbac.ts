// RBAC do Byte Force — autorizacao AVALIADA NO SERVIDOR.
// Esconder botao no frontend nao e seguranca; a checagem real acontece aqui,
// em toda server action / carregamento de pagina protegida.
import { requireTenant } from "@/lib/session";
import { can, type Permission } from "@/lib/permissions";

export { can } from "@/lib/permissions";
export type { Permission } from "@/lib/permissions";

export class ForbiddenError extends Error {
  constructor(permission: Permission) {
    super(`FORBIDDEN: falta permissao ${permission}`);
    this.name = "ForbiddenError";
  }
}

/** Garante tenant + permissao; retorna o contexto do ator. */
export async function requirePermission(permission: Permission) {
  const ctx = await requireTenant();
  if (!can(ctx.role, permission)) throw new ForbiddenError(permission);
  return ctx;
}
