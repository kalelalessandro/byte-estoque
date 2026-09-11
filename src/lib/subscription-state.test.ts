import { describe, it, expect } from "vitest";
import { subscriptionAccess, canTransition, computeStatusForNow, addInterval, GRACE_DAYS } from "./subscription-state";

const day = (n: number) => { const d = new Date("2026-01-01T00:00:00Z"); d.setDate(d.getDate() + n); return d; };

describe("assinatura — acesso por status", () => {
  it("TRIALING/ACTIVE/PAST_DUE permitem uso; SUSPENDED/CANCELED/EXPIRED bloqueiam", () => {
    expect(subscriptionAccess("ACTIVE").canUse).toBe(true);
    expect(subscriptionAccess("TRIALING").canUse).toBe(true);
    expect(subscriptionAccess("PAST_DUE").canUse).toBe(true);
    expect(subscriptionAccess("SUSPENDED").canUse).toBe(false);
    expect(subscriptionAccess("CANCELED").canUse).toBe(false);
    expect(subscriptionAccess("EXPIRED").canUse).toBe(false);
  });
});

describe("assinatura — transicoes", () => {
  it("permite ACTIVE->PAST_DUE e PAST_DUE->SUSPENDED", () => {
    expect(canTransition("ACTIVE", "PAST_DUE")).toBe(true);
    expect(canTransition("PAST_DUE", "SUSPENDED")).toBe(true);
  });
  it("nao permite sair de CANCELED", () => {
    expect(canTransition("CANCELED", "ACTIVE")).toBe(false);
  });
});

describe("assinatura — computeStatusForNow", () => {
  const base = { cancelAtPeriodEnd: false, trialEndsAt: null as Date | null };
  it("trial expirado vira PAST_DUE", () => {
    expect(computeStatusForNow({ ...base, status: "TRIALING", trialEndsAt: day(5), currentPeriodEnd: day(5) }, day(6))).toBe("PAST_DUE");
  });
  it("ativo vencido vira PAST_DUE", () => {
    expect(computeStatusForNow({ ...base, status: "ACTIVE", currentPeriodEnd: day(30) }, day(31))).toBe("PAST_DUE");
  });
  it("ativo vencido com cancelamento agendado vira EXPIRED", () => {
    expect(computeStatusForNow({ ...base, status: "ACTIVE", cancelAtPeriodEnd: true, currentPeriodEnd: day(30) }, day(31))).toBe("EXPIRED");
  });
  it("PAST_DUE apos a tolerancia vira SUSPENDED", () => {
    expect(computeStatusForNow({ ...base, status: "PAST_DUE", currentPeriodEnd: day(30) }, day(30 + GRACE_DAYS + 1))).toBe("SUSPENDED");
  });
  it("ativo dentro do periodo continua ACTIVE", () => {
    expect(computeStatusForNow({ ...base, status: "ACTIVE", currentPeriodEnd: day(30) }, day(10))).toBe("ACTIVE");
  });
});

describe("assinatura — addInterval", () => {
  it("mensal soma 1 mes; anual soma 1 ano", () => {
    expect(addInterval(new Date("2026-01-15"), "MONTHLY").getMonth()).toBe(1);
    expect(addInterval(new Date("2026-01-15"), "ANNUAL").getFullYear()).toBe(2027);
  });
});
