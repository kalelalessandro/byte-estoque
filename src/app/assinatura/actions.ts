"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { changePlan, cancelSubscription, DowngradeBlockedError } from "@/server/subscriptions";
import { startCheckout } from "@/server/payments";
import { ProviderNotConfiguredError } from "@/lib/payments/provider";
import type { PlanTier, BillingInterval } from "@prisma/client";

type Result = { ok: true } | { ok: false; error: string };
const PLANS: PlanTier[] = ["STARTER", "PRO", "BUSINESS", "ENTERPRISE"];

export async function changePlanAction(raw: { plan: string; interval: string }): Promise<Result> {
  const { tenantId, userId } = await requirePermission("billing:manage");
  if (!PLANS.includes(raw.plan as PlanTier)) return { ok: false, error: "Plano invalido." };
  const interval = (raw.interval === "ANNUAL" ? "ANNUAL" : "MONTHLY") as BillingInterval;
  try {
    await changePlan(tenantId, userId, raw.plan as PlanTier, interval);
  } catch (e) {
    if (e instanceof DowngradeBlockedError) {
      const parts = e.violations.map((v) => `${v.resource}: ${v.count}/${v.limit}`).join(", ");
      return { ok: false, error: `Downgrade bloqueado — uso atual excede o novo plano (${parts}). Reduza antes de trocar.` };
    }
    return { ok: false, error: "Nao foi possivel alterar o plano." };
  }
  revalidatePath("/assinatura");
  return { ok: true };
}

export async function cancelAction(raw: { atPeriodEnd: boolean }): Promise<Result> {
  const { tenantId, userId } = await requirePermission("billing:manage");
  try {
    await cancelSubscription(tenantId, userId, !!raw.atPeriodEnd);
  } catch {
    return { ok: false, error: "Nao foi possivel cancelar." };
  }
  revalidatePath("/assinatura");
  return { ok: true };
}

export async function startCheckoutAction(raw: { plan: string; interval: string }): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { tenantId, userId } = await requirePermission("billing:manage");
  const session = await auth();
  const email = session?.user?.email ?? "";
  if (!PLANS.includes(raw.plan as PlanTier)) return { ok: false, error: "Plano invalido." };
  const interval = (raw.interval === "ANNUAL" ? "ANNUAL" : "MONTHLY") as BillingInterval;
  try {
    const { url } = await startCheckout(tenantId, userId, raw.plan as PlanTier, interval, email);
    return { ok: true, url };
  } catch (e) {
    if (e instanceof ProviderNotConfiguredError) return { ok: false, error: "Gateway de pagamento nao configurado (defina PAYMENT_PROVIDER e as chaves)." };
    return { ok: false, error: "Nao foi possivel iniciar o checkout." };
  }
}