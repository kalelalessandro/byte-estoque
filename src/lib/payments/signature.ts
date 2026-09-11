// Verificacao da autenticidade do webhook do Mercado Pago.
// Header x-signature: "ts=<ts>,v1=<hmac_hex>". Manifesto assinado:
//   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
// HMAC-SHA256(secret) do manifesto == v1. Comparacao em tempo constante.
import { createHmac, timingSafeEqual } from "crypto";

export function parseXSignature(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  let ts = "", v1 = "";
  for (const part of header.split(",")) {
    const [k, val] = part.split("=", 2).map((x) => x?.trim());
    if (k === "ts") ts = val ?? "";
    if (k === "v1") v1 = val ?? "";
  }
  return ts && v1 ? { ts, v1 } : null;
}

export function verifyMercadoPagoSignature(args: {
  dataId: string | null; requestId: string | null; xSignature: string | null; secret: string;
}): boolean {
  const parsed = parseXSignature(args.xSignature);
  if (!parsed || !args.secret) return false;
  const manifest = `id:${args.dataId ?? ""};request-id:${args.requestId ?? ""};ts:${parsed.ts};`;
  const expected = createHmac("sha256", args.secret).update(manifest).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(parsed.v1, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
