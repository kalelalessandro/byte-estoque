// Provedor Mercado Pago (atras da interface PaymentProvider).
// Recorrencia via /preapproval (cartao). Pix avulso via /v1/payments.
// Autenticidade do webhook: HMAC-SHA256 sobre o manifesto
//   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
// conforme a doc oficial (header x-signature = "ts=...,v1=...").
//
// Requer env: MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, APP_URL.
// NENHUMA credencial fica no codigo — tudo via ambiente.
import { createHmac, timingSafeEqual } from "crypto";
import type { CanonicalEvent, CheckoutRequest, CheckoutSession, PaymentProvider, WebhookRequest } from "./provider";
import { InvalidWebhookSignatureError, ProviderNotConfiguredError } from "./provider";

const API = "https://api.mercadopago.com";

function token(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new ProviderNotConfiguredError();
  return t;
}

// ---------- Partes PURAS (testaveis sem gateway) ----------

/** Monta o manifesto e valida o HMAC do header x-signature. Puro. */
export function verifyMercadoPagoSignature(
  secret: string,
  parts: { dataId?: string; requestId?: string; xSignature?: string },
): boolean {
  if (!secret || !parts.xSignature) return false;
  const kv = Object.fromEntries(parts.xSignature.split(",").map((p) => p.split("=").map((x) => x.trim())) as [string, string][]);
  const ts = kv.ts, v1 = kv.v1;
  if (!ts || !v1) return false;

  const segs: string[] = [];
  if (parts.dataId) segs.push(`id:${parts.dataId};`);
  if (parts.requestId) segs.push(`request-id:${parts.requestId};`);
  segs.push(`ts:${ts};`);
  const manifest = segs.join("");

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Mapeia status de pagamento MP -> tipo canonico. Puro. */
export function mapMpPaymentStatus(status: string): CanonicalEvent["kind"] {
  switch (status) {
    case "approved": return "payment_approved";
    case "authorized": return "payment_approved";
    case "refunded":
    case "charged_back": return "payment_failed";
    case "rejected":
    case "cancelled": return "payment_failed";
    default: return "unknown";
  }
}

// ---------- Chamadas ao gateway (dependem de credenciais/rede) ----------

async function mpFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`MP_HTTP_${res.status}: ${await res.text()}`);
  return res.json();
}

export class MercadoPagoProvider implements PaymentProvider {
  readonly id = "mercadopago";

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const body = {
      reason: `ByteForce ${req.plan} (${req.interval})`,
      external_reference: req.tenantId,
      payer_email: req.customerEmail,
      back_url: `${appUrl}/assinatura`,
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      auto_recurring: {
        frequency: req.interval === "ANNUAL" ? 12 : 1,
        frequency_type: "months",
        transaction_amount: req.amount,
        currency_id: "BRL",
      },
      status: "pending",
    };
    const data = (await mpFetch("/preapproval", { method: "POST", body: JSON.stringify(body) })) as { id: string; init_point?: string; sandbox_init_point?: string };
    return { url: data.init_point ?? data.sandbox_init_point ?? `${appUrl}/assinatura`, providerRef: data.id };
  }

  async cancelSubscription(providerRef: string): Promise<void> {
    await mpFetch(`/preapproval/${providerRef}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) });
  }

  async refund(paymentRef: string): Promise<void> {
    await mpFetch(`/v1/payments/${paymentRef}/refunds`, { method: "POST", body: JSON.stringify({}) });
  }

  async fetchSubscriptionStatus(providerRef: string): Promise<"active" | "paused" | "cancelled" | "pending" | "unknown"> {
    const data = (await mpFetch(`/preapproval/${providerRef}`)) as { status?: string };
    switch (data.status) {
      case "authorized": return "active";
      case "paused": return "paused";
      case "cancelled": return "cancelled";
      case "pending": return "pending";
      default: return "unknown";
    }
  }

  async verifyAndParseWebhook(req: WebhookRequest): Promise<CanonicalEvent> {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) throw new ProviderNotConfiguredError();
    const dataId = req.query["data.id"] ?? req.query["id"];
    const ok = verifyMercadoPagoSignature(secret, {
      dataId,
      requestId: req.headers["x-request-id"],
      xSignature: req.headers["x-signature"],
    });
    if (!ok) throw new InvalidWebhookSignatureError();

    const body = JSON.parse(req.rawBody) as { type?: string; action?: string; data?: { id?: string } };
    const resourceId = body.data?.id ?? dataId ?? "";
    const eventKey = `${body.type ?? body.action ?? "event"}:${resourceId}`;

    // Consulta o recurso para status real + external_reference (depende do gateway).
    if (body.type === "payment") {
      const pay = (await mpFetch(`/v1/payments/${resourceId}`)) as { status: string; external_reference?: string; transaction_amount?: number; payment_type_id?: string };
      return {
        kind: mapMpPaymentStatus(pay.status),
        externalId: eventKey,
        providerRef: resourceId,
        tenantId: pay.external_reference ?? null,
        amount: pay.transaction_amount ?? null,
        method: pay.payment_type_id === "pix" ? "PIX" : "CARD",
        raw: body,
      };
    }
    if (body.type === "subscription_preapproval") {
      const pre = (await mpFetch(`/preapproval/${resourceId}`)) as { status: string; external_reference?: string };
      const kind: CanonicalEvent["kind"] = pre.status === "authorized" ? "payment_approved" : pre.status === "cancelled" ? "subscription_canceled" : "unknown";
      return { kind, externalId: eventKey, providerRef: resourceId, tenantId: pre.external_reference ?? null, raw: body };
    }
    return { kind: "unknown", externalId: eventKey, providerRef: resourceId || null, tenantId: null, raw: body };
  }
}
