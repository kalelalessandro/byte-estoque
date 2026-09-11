import { describe, it, expect } from "vitest";
import { authorizeCron } from "./cron-auth";

describe("cron auth", () => {
  it("aceita Bearer com o segredo correto", () => {
    expect(authorizeCron("Bearer s3cr3t", "s3cr3t")).toBe(true);
  });
  it("rejeita segredo errado, header ausente ou secret nao configurado", () => {
    expect(authorizeCron("Bearer errado", "s3cr3t")).toBe(false);
    expect(authorizeCron(null, "s3cr3t")).toBe(false);
    expect(authorizeCron("Bearer s3cr3t", undefined)).toBe(false);
  });
});
