import { describe, it, expect } from "vitest";
import { dataCategory, isAnonymizedOnDeletion, isRetainedOnDeletion } from "./classification";
import { anonymizedCustomerFields, anonymizedUserFields } from "./anonymize";
import { can } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

describe("LGPD — classificacao de dados", () => {
  it("clientes/fornecedores/usuarios sao pessoais (anonimizados)", () => {
    for (const e of ["Customer", "Supplier", "User"]) { expect(dataCategory(e)).toBe("personal"); expect(isAnonymizedOnDeletion(e)).toBe(true); expect(isRetainedOnDeletion(e)).toBe(false); }
  });
  it("vendas/pagamentos sao financeiros (RETIDOS, nao anonimizados)", () => {
    for (const e of ["Sale", "Payment", "FinanceEntry", "StockMovement"]) { expect(dataCategory(e)).toBe("financial"); expect(isRetainedOnDeletion(e)).toBe(true); expect(isAnonymizedOnDeletion(e)).toBe(false); }
  });
  it("auditoria/webhooks sao seguranca (RETIDOS)", () => {
    for (const e of ["AuditLog", "WebhookEvent", "SubscriptionEvent"]) { expect(dataCategory(e)).toBe("security"); expect(isRetainedOnDeletion(e)).toBe(true); }
  });
});

describe("LGPD — anonimizacao", () => {
  it("cliente: remove dados pessoais mantendo estrutura", () => {
    const f = anonymizedCustomerFields();
    expect(f.name).toContain("Anonimizado"); expect(f.document).toBeNull(); expect(f.email).toBeNull(); expect(f.phone).toBeNull();
  });
  it("usuario: email unico invalido + inativo", () => {
    const f = anonymizedUserFields("abc-123");
    expect(f.email).toContain("abc-123"); expect(f.email).toContain("@lgpd.local"); expect(f.active).toBe(false);
  });
});

describe("LGPD — autorizacao (so OWNER/ADMIN administram)", () => {
  it("OWNER/ADMIN podem; demais NAO", () => {
    expect(can("OWNER", "lgpd:manage")).toBe(true);
    expect(can("ADMIN", "lgpd:manage")).toBe(true);
    for (const r of ["MANAGER", "SELLER", "STOCKIST", "FINANCE", "MEMBER"] as UserRole[]) expect(can(r, "lgpd:manage")).toBe(false);
  });
});
