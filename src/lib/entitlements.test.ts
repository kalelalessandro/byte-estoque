import { describe, it, expect } from "vitest";
import { limitFor, isWithinLimit } from "./entitlements";

describe("entitlements / limites de plano", () => {
  it("STARTER limita produtos", () => {
    expect(limitFor("STARTER", "products")).toBe(100);
    expect(isWithinLimit("STARTER", "products", 99)).toBe(true);
    expect(isWithinLimit("STARTER", "products", 100)).toBe(false);
  });
  it("ENTERPRISE e ilimitado", () => {
    expect(limitFor("ENTERPRISE", "users")).toBe(-1);
    expect(isWithinLimit("ENTERPRISE", "users", 999999)).toBe(true);
  });
  it("PRO tem mais folga que STARTER", () => {
    expect(limitFor("PRO", "products")).toBeGreaterThan(limitFor("STARTER", "products"));
  });
});
