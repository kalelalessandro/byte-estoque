// Servico de Pagamentos. Orquestra o provedor (abstrato) com o dominio de
// Assinaturas. Idempotencia via webhook_events (tabela de plataforma). O estado
// oficial vem SEMPRE do backend/gateway/webhook — nunca do frontend.
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { getPaymentProvider } from "@/lib/payments";
import { InvalidWebhookSignatureError, type WebhookRequest } from "@/lib/payments/provider";
import { PLAN_CATALOG } from "@/lib/plans";
import { activateFromPayment, markPastDue, suspend } from "@/server/subscriptions";
import { notifyBilling } from "@/server/notifications";
import type { PlanTier, BillingInterval } from "@prisma/client";

export async function startCheckout(tenantId: string, actorId: string, plan: PlanTier, interval: BillingInterval, email: string): Promise<{ url: string }> {
  const provider = getPaymentProvider();
  const amount = interval === "ANNUAL" ? PLAN_CATALOG[plan].annual : PLAN_CATALOG[plan].monthly;
  // Chamada ao gateway (depende de credenciais). Erros sobem para a action.
  const session = await provider.createCheckout({ tenantId, plan, interval, amount, customerEmail: email });

  await withTenant(tenantId, async (tx) => {
    await tx.payment.create({
      data: { tenantId, provider: provider.id, providerRef: session.providerRef, externalReference: tenantId, amount, status: "PENDING" },
    });
    await tx.subscription.update({ where: { tenantId }, data: { providerRef: session.providerRef, plan, interval } });
    await audit(tx, { tenantId, userId: actorId, action: "payment.checkout_started", entity: "Payment", metadata: { plan, interval, provider: provider.id } });
  });
  return { url: session.url };
}

export type WebhookOutcome = "processed" | "duplicate" | "unrouted" | "ignored";

export async function handleWebhook(req: WebhookRequest): Promise<WebhookOutcome> {
  const provider = getPaymentProvider();
  const event = await provider.verifyAndParseWebhook(req); // lanca InvalidWebhookSignatureError se invalido

  // Idempotencia: (provider, externalId) unico. Se ja existe, e duplicado.
  try {
    await prisma.webhookEvent.create({
      data: { provider: provider.id, externalId: event.externalId, type: event.kind, tenantId: event.tenantId ?? null, payload: (event.raw ?? {}) as object, status: "RECEIVED" },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique")) return "duplicate";
    throw e;
  }

  const finish = (status: string, error?: string) =>
    prisma.webhookEvent.update({ where: { provider_externalId: { provider: provider.id, externalId: event.externalId } }, data: { status, error: error ?? null, processedAt: new Date() } });

  if (!event.tenantId) { await finish("FAILED", "sem tenant (external_reference)"); return "unrouted"; }
  const tenantId = event.tenantId;

  try {
    if (event.kind === "payment_approved") {
      await activateFromPayment(tenantId, event.providerRef);
      await withTenant(tenantId, async (tx) => {
        const upd = await tx.payment.updateMany({ where: { providerRef: event.providerRef ?? undefined }, data: { status: "APPROVED", method: event.method ?? null } });
        if (upd.count === 0 && event.amount != null) {
          await tx.payment.create({ data: { tenantId, provider: provider.id, providerRef: event.providerRef, externalReference: tenantId, amount: event.amount, method: event.method ?? null, status: "APPROVED" } });
        }
        await audit(tx, { tenantId, action: "payment.approved", entity: "Payment", entityId: event.providerRef, metadata: { via: "webhook" } });
      });
      await notifyBilling(tenantId, "subscription_recovered", "Pagamento aprovado", "Sua assinatura esta ativa.", { amount: event.amount ?? 0 }, ["approved", event.providerRef ?? ""]);
    } else if (event.kind === "payment_failed") {
      await markPastDue(tenantId);
      await withTenant(tenantId, (tx) => tx.payment.updateMany({ where: { providerRef: event.providerRef ?? undefined }, data: { status: "REJECTED" } }));
      await notifyBilling(tenantId, "payment_failed", "Falha no pagamento", "Nao conseguimos processar seu pagamento.", {}, ["failed", event.providerRef ?? ""]);
    } else if (event.kind === "subscription_canceled") {
      await suspend(tenantId);
    } else {
      await finish("SKIPPED"); return "ignored";
    }
    await finish("PROCESSED");
    return "processed";
  } catch (err) {
    await finish("FAILED", err instanceof Error ? err.message : "erro");
    throw err;
  }
}

export { InvalidWebhookSignatureError };

// Reconciliacao: alinha o estado local ao status real do gateway (evita divergencia).
// Depende do gateway (fetchSubscriptionStatus).
export async function reconcileSubscription(tenantId: string): Promise<{ remote: string; aligned: boolean }> {
  const provider = getPaymentProvider();
  const sub = await withTenant(tenantId, (tx) => tx.subscription.findUnique({ where: { tenantId }, select: { providerRef: true, status: true } })) as { providerRef: string | null; status: string } | null;
  if (!sub?.providerRef) return { remote: "no-ref", aligned: false };
  const remote = await provider.fetchSubscriptionStatus(sub.providerRef);
  if (remote === "active" && sub.status !== "ACTIVE") { await activateFromPayment(tenantId, sub.providerRef); return { remote, aligned: true }; }
  if (remote === "cancelled" && sub.status !== "SUSPENDED" && sub.status !== "CANCELED") { await suspend(tenantId); return { remote, aligned: true }; }
  return { remote, aligned: false };
}
