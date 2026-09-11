import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyMercadoPagoSignature, mapMpPaymentStatus } from "./mercadopago";

function sign(secret: string, dataId: string, requestId: string, ts: string) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("Mercado Pago — assinatura do webhook (HMAC)", () => {
  const secret = "test_secret_123";
  it("aceita assinatura valida", () => {
    const xSig = sign(secret, "999", "req-abc", "1700000000");
    expect(verifyMercadoPagoSignature(secret, { dataId: "999", requestId: "req-abc", xSignature: xSig })).toBe(true);
  });
  it("rejeita assinatura adulterada", () => {
    const xSig = sign(secret, "999", "req-abc", "1700000000").replace(/v1=.*/, "v1=deadbeef");
    expect(verifyMercadoPagoSignature(secret, { dataId: "999", requestId: "req-abc", xSignature: xSig })).toBe(false);
  });
  it("rejeita se o dataId nao bate (manifesto diferente)", () => {
    const xSig = sign(secret, "999", "req-abc", "1700000000");
    expect(verifyMercadoPagoSignature(secret, { dataId: "888", requestId: "req-abc", xSignature: xSig })).toBe(false);
  });
  it("rejeita sem segredo ou sem header", () => {
    expect(verifyMercadoPagoSignature("", { dataId: "1", xSignature: "ts=1,v1=x" })).toBe(false);
    expect(verifyMercadoPagoSignature(secret, { dataId: "1" })).toBe(false);
  });
});

describe("Mercado Pago — mapa de status", () => {
  it("approved/authorized -> aprovado; rejected -> falha", () => {
    expect(mapMpPaymentStatus("approved")).toBe("payment_approved");
    expect(mapMpPaymentStatus("authorized")).toBe("payment_approved");
    expect(mapMpPaymentStatus("rejected")).toBe("payment_failed");
    expect(mapMpPaymentStatus("weird")).toBe("unknown");
  });
});
