import { describe, it, expect } from "vitest";
import { renderEmail } from "./templates";

describe("templates de e-mail", () => {
  it("estoque baixo inclui produto e saldo, e escapa HTML", () => {
    const r = renderEmail("low_stock", { product: "<b>Caneta</b>", balance: 2, min: 5 });
    expect(r.subject).toContain("Caneta");
    expect(r.html).not.toContain("<b>Caneta</b>"); // escapado
    expect(r.html).toContain("&lt;b&gt;");
  });
  it("todos os templates retornam subject/html/text nao vazios", () => {
    const templates = ["invite", "low_stock", "payment_approved", "payment_failed", "subscription_expiring", "subscription_suspended", "subscription_recovered"] as const;
    for (const t of templates) {
      const r = renderEmail(t, { company: "X", link: "http://x", amount: 10, date: "01/01", product: "P", balance: 1, min: 2 });
      expect(r.subject.length).toBeGreaterThan(0);
      expect(r.html.length).toBeGreaterThan(0);
      expect(r.text.length).toBeGreaterThan(0);
    }
  });
});
