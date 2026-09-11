import type { PlanTier } from "@prisma/client";

export type PlanCatalogEntry = { label: string; monthly: number; annual: number; trialDays: number; order: number };

export const PLAN_CATALOG: Record<PlanTier, PlanCatalogEntry> = {
  STARTER:    { label: "Starter",    monthly: 49,  annual: 490,   trialDays: 14, order: 1 },
  PRO:        { label: "Pro",        monthly: 149, annual: 1490,  trialDays: 14, order: 2 },
  BUSINESS:   { label: "Business",   monthly: 399, annual: 3990,  trialDays: 14, order: 3 },
  ENTERPRISE: { label: "Enterprise", monthly: 0,   annual: 0,     trialDays: 0,  order: 4 }, // sob consulta
};

export function planOrder(p: PlanTier): number { return PLAN_CATALOG[p].order; }
export function isUpgrade(from: PlanTier, to: PlanTier): boolean { return planOrder(to) > planOrder(from); }
export function isDowngrade(from: PlanTier, to: PlanTier): boolean { return planOrder(to) < planOrder(from); }
