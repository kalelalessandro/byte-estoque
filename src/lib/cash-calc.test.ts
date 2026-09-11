import { describe, it, expect } from "vitest";
import { expectedBalance } from "./cash-calc";

describe("caixa / saldo esperado", () => {
  it("soma vendas e suprimentos, subtrai sangrias", () => {
    expect(expectedBalance(100, [
      { type: "SALE", amount: 50 },
      { type: "SUPPLY", amount: 20 },
      { type: "WITHDRAWAL", amount: 30 },
    ])).toBe(140);
  });
  it("sem movimentos, mantem a abertura", () => {
    expect(expectedBalance(200, [])).toBe(200);
  });
});
