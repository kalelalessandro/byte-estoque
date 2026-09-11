// Planos, features e limites. Alterar limites aqui NAO exige mexer no resto do
// sistema — a checagem e centralizada em assertWithinLimit().
import type { PlanTier, Prisma } from "@prisma/client";

export type LimitedResource = "products" | "customers" | "suppliers" | "users";

// -1 = ilimitado.
export const PLAN_LIMITS: Record<PlanTier, Record<LimitedResource, number>> = {
  STARTER:    { products: 100,  customers: 500,   suppliers: 100,  users: 3 },
  PRO:        { products: 2000, customers: 10000, suppliers: 1000, users: 15 },
  BUSINESS:   { products: 20000, customers: 100000, suppliers: 10000, users: 100 },
  ENTERPRISE: { products: -1,   customers: -1,    suppliers: -1,   users: -1 },
};

export function limitFor(plan: PlanTier, resource: LimitedResource): number {
  return PLAN_LIMITS[plan][resource];
}

/** Logica pura, testavel: um novo registro cabe no limite? */
export function isWithinLimit(plan: PlanTier, resource: LimitedResource, currentCount: number): boolean {
  const limit = limitFor(plan, resource);
  return limit < 0 || currentCount < limit;
}

export class LimitExceededError extends Error {
  constructor(public resource: LimitedResource, public limit: number, public plan: PlanTier) {
    super(`LIMIT_EXCEEDED: plano ${plan} permite no maximo ${limit} de ${resource}`);
    this.name = "LimitExceededError";
  }
}

const COUNTERS: Record<LimitedResource, (tx: Prisma.TransactionClient, tenantId: string) => Promise<number>> = {
  products: (tx) => tx.product.count({ where: { deletedAt: null } }),
  customers: (tx) => tx.customer.count({ where: { deletedAt: null } }),
  suppliers: (tx) => tx.supplier.count({ where: { deletedAt: null } }),
  users: (tx, tenantId) => tx.user.count({ where: { tenantId } }),
};

/**
 * Verifica o limite do plano DENTRO da transacao da criacao (conta atual sob RLS)
 * e lanca LimitExceededError se estourar. Chamado antes de todo create limitado.
 */
export async function assertWithinLimit(
  tx: Prisma.TransactionClient,
  tenantId: string,
  resource: LimitedResource,
) {
  const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
  const plan = tenant?.plan ?? "STARTER";
  const current = await COUNTERS[resource](tx, tenantId);
  if (!isWithinLimit(plan, resource, current)) {
    throw new LimitExceededError(resource, limitFor(plan, resource), plan);
  }
}
