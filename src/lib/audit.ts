import type { Prisma } from "@prisma/client";

/**
 * Registra uma acao de auditoria DENTRO da mesma transacao da operacao,
 * garantindo que log e mutacao sao atomicos (ou ambos, ou nenhum).
 * Como roda no `tx` do withTenant(), o RLS ja garante o tenant correto.
 */
export function audit(
  tx: Prisma.TransactionClient,
  data: {
    tenantId: string;
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return tx.auditLog.create({
    data: {
      tenantId: data.tenantId,
      userId: data.userId ?? null,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId ?? null,
      metadata: data.metadata,
    },
  });
}
