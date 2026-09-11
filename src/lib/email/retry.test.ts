import { describe, it, expect } from "vitest";
import { nextBackoffMs, emailIdempotencyKey } from "./retry";

describe("retry de e-mail", () => {
  it("backoff cresce e tem teto de 6h", () => {
    expect(nextBackoffMs(1)).toBe(60_000);
    expect(nextBackoffMs(2)).toBe(120_000);
    expect(nextBackoffMs(50)).toBe(6 * 60 * 60_000); // teto
  });
  it("chave de idempotencia e deterministica", () => {
    expect(emailIdempotencyKey(["t1", "low_stock", "P", 3])).toBe("t1:low_stock:P:3");
  });
});
