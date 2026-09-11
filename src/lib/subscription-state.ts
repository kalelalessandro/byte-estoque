import type { SubscriptionStatus, BillingInterval } from "@prisma/client";

export const GRACE_DAYS = 7; // apos vencer, PAST_DUE por ate 7 dias antes de SUSPENDED

// Statuses que permitem USAR o sistema. PAST_DUE = periodo de tolerancia (acesso
// mantido, com aviso). SUSPENDED/CANCELED/EXPIRED = bloqueado.
export function subscriptionAccess(status: SubscriptionStatus): { canUse: boolean; warn: boolean; reason: string } {
  switch (status) {
    case "TRIALING": return { canUse: true, warn: true, reason: "trial" };
    case "ACTIVE": return { canUse: true, warn: false, reason: "active" };
    case "PAST_DUE": return { canUse: true, warn: true, reason: "past_due" };
    case "SUSPENDED": return { canUse: false, warn: true, reason: "suspended" };
    case "CANCELED": return { canUse: false, warn: true, reason: "canceled" };
    case "EXPIRED": return { canUse: false, warn: true, reason: "expired" };
    default: return { canUse: false, warn: true, reason: "unknown" };
  }
}

const ALLOWED: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  TRIALING: ["ACTIVE", "PAST_DUE", "CANCELED"],
  ACTIVE: ["PAST_DUE", "CANCELED", "EXPIRED", "ACTIVE"],
  PAST_DUE: ["ACTIVE", "SUSPENDED", "CANCELED"],
  SUSPENDED: ["ACTIVE", "CANCELED"],
  CANCELED: [],
  EXPIRED: ["ACTIVE"],
};
export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  return from === to || ALLOWED[from].includes(to);
}

export function addInterval(base: Date, interval: BillingInterval): Date {
  const d = new Date(base);
  if (interval === "MONTHLY") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

// Deriva o status "de agora" a partir dos campos (expiracao de trial/periodo,
// tolerancia e cancelamento agendado). Funcao pura: nao toca em DB.
export function computeStatusForNow(
  sub: { status: SubscriptionStatus; trialEndsAt: Date | null; currentPeriodEnd: Date; cancelAtPeriodEnd: boolean },
  now: Date,
): SubscriptionStatus {
  const { status } = sub;
  if (status === "CANCELED" || status === "EXPIRED") return status;

  if (status === "TRIALING") {
    if (sub.trialEndsAt && now >= sub.trialEndsAt) return "PAST_DUE";
    return status;
  }
  if (status === "ACTIVE") {
    if (now >= sub.currentPeriodEnd) return sub.cancelAtPeriodEnd ? "EXPIRED" : "PAST_DUE";
    return status;
  }
  if (status === "PAST_DUE") {
    const graceEnd = new Date(sub.currentPeriodEnd);
    graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS);
    if (now >= graceEnd) return "SUSPENDED";
    return status;
  }
  return status; // SUSPENDED permanece ate um pagamento reativar
}
