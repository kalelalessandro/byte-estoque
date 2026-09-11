import { describe, it, expect } from "vitest";
import { round2, lineTotal, docTotal } from "./money";

describe("money", () => {
  it("arredonda a 2 casas", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(lineTotal(3, 9.99)).toBe(29.97);
  });
  it("docTotal soma linhas e aplica frete/desconto", () => {
    expect(docTotal([10, 20], { add: 5, sub: 3 })).toBe(32);
  });
  it("docTotal nunca fica negativo", () => {
    expect(docTotal([10], { sub: 50 })).toBe(0);
  });
});
