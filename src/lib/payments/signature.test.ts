import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyMercadoPagoSignature, parseXSignature } from "./signature";

const secret = "test_secret";
function sign(dataId: string, requestId: string, ts: string) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

describe("assinatura do webhook Mercado Pago", () => {
  it("parseia o header x-signature", () => {
    expect(parseXSignature("ts=123,v1=abc")).toEqual({ ts: "123", v1: "abc" });
    expect(parseXSignature(null)).toBeNull();
  });
  it("aceita assinatura valida", () => {
    const ts = "1704908010"; const v1 = sign("PAY1", "req1", ts);
    expect(verifyMercadoPagoSignature({ dataId: "PAY1", requestId: "req1", xSignature: `ts=${ts},v1=${v1}`, secret })).toBe(true);
  });
  it("rejeita assinatura adulterada", () => {
    const ts = "1704908010"; const v1 = sign("PAY1", "req1", ts);
    expect(verifyMercadoPagoSignature({ dataId: "PAY_OTHER", requestId: "req1", xSignature: `ts=${ts},v1=${v1}`, secret })).toBe(false);
  });
  it("rejeita sem secret ou sem header", () => {
    expect(verifyMercadoPagoSignature({ dataId: "x", requestId: "y", xSignature: null, secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ dataId: "x", requestId: "y", xSignature: "ts=1,v1=2", secret: "" })).toBe(false);
  });
});
