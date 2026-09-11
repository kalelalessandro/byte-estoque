// Dominio de Assinaturas. Transacional, sob RLS, com historico (SubscriptionEvent)
// e integracao com os limites de plano (bloqueia downgrade que estoura o uso).
// A maquina de estados vive em lib/subscription-state.ts (pura, testada).
import type { Prisma, PlanTier, BillingInterval, SubscriptionStatus } from "@prisma/client";
import { withTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { PLAN_CATALOG, isDowngrade } from "@/lib/plans";
import { addInterval, computeStatusForNow, canTransition } from "@/lib/subscription-state";
import { limitFor, type LimitedResource } from "@/lib/entitlements";

export class DowngradeBlockedError extends Error {
  constructor(public violations: { resource: LimitedResource; count: number; limit: number }[]) {
    super("DOWNGRADE_BLOCKED"); this.name = "DowngradeBlockedError";
  }
}

type Sub = Prisma.SubscriptionGetPayload<object>;

async function logEvent(
  tx: Prisma.TransactionClient, tenantId: string, type: string,
  extra: { fromStatus?: string; toStatus?: string; fromPlan?: string; toPlan?: string; userId?: string | null; metadata?: Prisma.InputJsonValue } = {},
) {
  await tx.subscriptionEvent.create({
    data: { tenantId, type, fromStatus: extra.fromStatus ?? null, toStatus: extra.toStatus ?? null, fromPlan: extra.fromPlan ?? null, toPlan: extra.toPlan ?? null, userId: extra.userId ?? null, metadata: extra.metadata },
  });
}

async function ensureTx(tx: Prisma.TransactionClient, tenantId: string): Promise<Sub> {
  const existing = await tx.subscription.findUnique({ where: { tenantId } });
  if (existing) return existing;
  const now = new Date();
  const trialEnds = new Date(now); trialEnds.setDate(trialEnds.getDate() + PLAN_CATALOG.STARTER.trialDays);
  const sub = await tx.subscription.create({
    data: { tenantId, plan: "STARTER", status: "TRIALING", interval: "MONTHLY", currentPeriodStart: now, currentPeriodEnd: trialEnds, trialEndsAt: trialEnds },
  });
  await logEvent(tx, tenantId, "created", { toStatus: "TRIALING", toPlan: "STARTER" });
  return sub;
}

// Aplica a maquina de estados (expiracao/tolerancia) e persiste se mudou.
async function refreshTx(tx: Prisma.TransactionClient, tenantId: string, sub: Sub): Promise<Sub> {
  const next = computeStatusForNow(sub, new Date());
  if (next !== sub.status && canTransition(sub.status, next)) {
    const updated = await tx.subscription.update({ where: { tenantId }, data: { status: next } });
    await logEvent(tx, tenantId, "status_changed", { fromStatus: sub.status, toStatus: next });
    return updated;
  }
  return sub;
}

export function ensureSubscription(tenantId: string) {
  return withTenant(tenantId, (tx) => ensureTx(tx, tenantId));
}

/** Estado atual (cria se faltar, aplica expiracao/tolerancia). Usado no gate e na tela. */
export function getSubscription(tenantId: string) {
  return withTenant(tenantId, async (tx) => refreshTx(tx, tenantId, await ensureTx(tx, tenantId)));
}

export function listEvents(tenantId: string, limit = 20) {
  return withTenant(tenantId, (tx) => tx.subscriptionEvent.findMany({ orderBy: { createdAt: "desc" }, take: limit }));
}

export function changePlan(tenantId: string, actorId: string, plan: PlanTier, interval: BillingInterval) {
  return withTenant(tenantId, async (tx) => {
    const sub = await ensureTx(tx, tenantId);
    if (isDowngrade(sub.plan, plan)) {
      const resources: LimitedResource[] = ["products", "customers", "suppliers", "users"];
      const counts = await Promise.all([
        tx.product.count({ where: { deletedAt: null } }),
        tx.customer.count({ where: { deletedAt: null } }),
        tx.supplier.count({ where: { deletedAt: null } }),
        tx.user.count({ where: { tenantId } }),
      ]);
      const violations = resources
        .map((r, i) => ({ resource: r, count: counts[i], limit: limitFor(plan, r) }))
        .filter((v) => v.limit >= 0 && v.count > v.limit);
      if (violations.length) throw new DowngradeBlockedError(violations);
    }
    const updated = await tx.subscription.update({ where: { tenantId }, data: { plan, interval } });
    await logEvent(tx, tenantId, "plan_changed", { fromPlan: sub.plan, toPlan: plan, userId: actorId, metadata: { interval } });
    await audit(tx, { tenantId, userId: actorId, action: "subscription.plan_changed", entity: "Subscription", entityId: sub.id, metadata: { from: sub.plan, to: plan, interval } });
    return updated;
  });
}

export function cancelSubscription(tenantId: string, actorId: string, atPeriodEnd: boolean) {
  return withTenant(tenantId, async (tx) => {
    const sub = await ensureTx(tx, tenantId);
    if (atPeriodEnd) {
      await tx.subscription.update({ where: { tenantId }, data: { cancelAtPeriodEnd: true } });
      await logEvent(tx, tenantId, "canceled", { userId: actorId, metadata: { atPeriodEnd: true } });
    } else {
      await tx.subscription.update({ where: { tenantId }, data: { status: "CANCELED", canceledAt: new Date(), cancelAtPeriodEnd: false } });
      await logEvent(tx, tenantId, "canceled", { fromStatus: sub.status, toStatus: "CANCELED", userId: actorId });
    }
    await audit(tx, { tenantId, userId: actorId, action: "subscription.canceled", entity: "Subscription", entityId: sub.id, metadata: { atPeriodEnd } });
  });
}

// ---- Operacoes dirigidas por PAGAMENTO/webhook (usadas no proximo modulo) ----

/** Pagamento confirmado: ativa e estende o periodo. Idempotente por natureza. */
export function activateFromPayment(tenantId: string, providerRef: string | null) {
  return withTenant(tenantId, async (tx) => {
    const sub = await ensureTx(tx, tenantId);
    const now = new Date();
    const base = sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now; // estende sem perder saldo
    const updated = await tx.subscription.update({
      where: { tenantId },
      data: { status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: addInterval(base, sub.interval), trialEndsAt: null, cancelAtPeriodEnd: false, ...(providerRef ? { providerRef } : {}) },
    });
    await logEvent(tx, tenantId, "renewed", { fromStatus: sub.status, toStatus: "ACTIVE", metadata: { providerRef } });
    return updated;
  });
}

export function markPastDue(tenantId: string) {
  return withTenant(tenantId, async (tx) => {
    const sub = await ensureTx(tx, tenantId);
    if (!canTransition(sub.status, "PAST_DUE")) return sub;
    const updated = await tx.subscription.update({ where: { tenantId }, data: { status: "PAST_DUE" } });
    await logEvent(tx, tenantId, "status_changed", { fromStatus: sub.status, toStatus: "PAST_DUE" });
    return updated;
  });
}

export function cancelFromProvider(tenantId: string) {
  return withTenant(tenantId, async (tx) => {
    const sub = await ensureTx(tx, tenantId);
    if (sub.status === "CANCELED") return sub;
    const updated = await tx.subscription.update({ where: { tenantId }, data: { status: "CANCELED", canceledAt: new Date() } });
    await logEvent(tx, tenantId, "canceled", { fromStatus: sub.status, toStatus: "CANCELED", metadata: { source: "provider" } });
    return updated;
  });
}

export function suspend(tenantId: string) {
  return withTenant(tenantId, async (tx) => {
    const sub = await ensureTx(tx, tenantId);
    if (!canTransition(sub.status, "SUSPENDED")) return sub;
    const updated = await tx.subscription.update({ where: { tenantId }, data: { status: "SUSPENDED" } });
    await logEvent(tx, tenantId, "status_changed", { fromStatus: sub.status, toStatus: "SUSPENDED" });
    return updated;
  });
}

// Aplica a transicao derivada do tempo (usada pelo cron e por leituras importantes).
export function applyTimeState(tenantId: string): Promise<{ changed: boolean; from?: string; to?: string }> {
  return withTenant(tenantId, async (tx) => {
    const sub = await ensureTx(tx, tenantId);
    const next = computeStatusForNow(sub, new Date());
    if (next !== sub.status && canTransition(sub.status, next)) {
      await tx.subscription.update({ where: { tenantId }, data: { status: next } });
      await logEvent(tx, tenantId, "status_changed", { fromStatus: sub.status, toStatus: next, metadata: { source: "cron" } });
      await audit(tx, { tenantId, action: `subscription.auto_${next.toLowerCase()}`, entity: "Subscription", entityId: sub.id });
      return { changed: true, from: sub.status, to: next };
    }
    return { changed: false };
  });
}
