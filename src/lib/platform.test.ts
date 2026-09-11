import { describe, it, expect } from "vitest";
import { isPlatformAdmin, assignableByTenantAdmin, publicWebhookRow, publicPaymentRow } from "./platform";
import type { UserRole } from "@prisma/client";

const TENANT_ROLES: UserRole[] = ["OWNER", "ADMIN", "MANAGER", "SELLER", "STOCKIST", "FINANCE", "MEMBER"];

describe("plataforma — autoridade separada do tenant", () => {
  it("so PLATFORM_ADMIN e autoridade de plataforma", () => {
    expect(isPlatformAdmin("PLATFORM_ADMIN")).toBe(true);
    for (const r of TENANT_ROLES) expect(isPlatformAdmin(r)).toBe(false);
    expect(isPlatformAdmin(undefined)).toBe(false);
  });
  it("OWNER/MANAGER e demais NAO podem ser promovidos a PLATFORM_ADMIN por admin de tenant", () => {
    expect(assignableByTenantAdmin("PLATFORM_ADMIN")).toBe(false); // bloqueia escalada
    for (const r of TENANT_ROLES) expect(assignableByTenantAdmin(r)).toBe(true);
  });
});

describe("plataforma — serializadores nao vazam dados sensiveis", () => {
  it("webhook: nunca inclui payload/segredos, mesmo se presentes no input", () => {
    const raw = { id: "1", provider: "mercadopago", externalId: "x", type: "payment_approved", status: "PROCESSED", error: null, createdAt: new Date(),
      payload: { secret: "shh", token: "abc", card: "4111" } } as never;
    const out = publicWebhookRow(raw);
    const keys = Object.keys(out);
    expect(keys).not.toContain("payload");
    expect(keys).not.toContain("token");
    expect(keys).not.toContain("secret");
    expect(JSON.stringify(out)).not.toContain("4111");
  });
  it("pagamento: expoe referencia externa mas nada de token/secret", () => {
    const out = publicPaymentRow({ id: "p1", provider: "mercadopago", providerRef: "pre_123", method: "PIX", amount: 149, status: "APPROVED", createdAt: new Date(), tenantName: "Acme" });
    expect(Object.keys(out)).not.toContain("token");
    expect(out.providerRef).toBe("pre_123");
  });
});
