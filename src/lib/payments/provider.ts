// Contrato de provedor de pagamento. O dominio depende SO desta interface —
// nunca de um SDK especifico. Concreto = MercadoPagoProvider; trocavel por env.
import type { BillingInterval, PlanTier } from "@prisma/client";

export type CheckoutRequest = {
  tenantId: string;
  plan: PlanTier;
  interval: BillingInterval;
  amount: number;
  customerEmail: string;
};
export type CheckoutSession = { url: string; providerRef: string };

export type WebhookRequest = {
  rawBody: string;
  headers: Record<string, string | undefined>;
  query: Record<string, string>;
};

// Evento canonico do dominio — o mapeamento do payload do gateway acontece no provedor.
export type CanonicalEvent = {
  kind: "payment_approved" | "payment_failed" | "subscription_canceled" | "unknown";
  externalId: string;          // id unico do evento/recurso no gateway (idempotencia)
  providerRef: string | null;  // id da assinatura/pagamento no gateway
  tenantId: string | null;     // external_reference que enviamos ao criar o checkout
  amount?: number | null;
  method?: "PIX" | "CARD" | null;
  raw: unknown;
};

export interface PaymentProvider {
  readonly id: string;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  cancelSubscription(providerRef: string): Promise<void>;
  refund(paymentRef: string): Promise<void>;
  // Para reconciliacao: consulta o status "de verdade" no gateway.
  fetchSubscriptionStatus(providerRef: string): Promise<"active" | "paused" | "cancelled" | "pending" | "unknown">;
  // Verifica autenticidade (HMAC) e converte o payload cru em evento canonico.
  verifyAndParseWebhook(req: WebhookRequest): Promise<CanonicalEvent>;
}

export class ProviderNotConfiguredError extends Error { constructor() { super("PAYMENT_PROVIDER_NOT_CONFIGURED"); this.name = "ProviderNotConfiguredError"; } }
export class InvalidWebhookSignatureError extends Error { constructor() { super("INVALID_WEBHOOK_SIGNATURE"); this.name = "InvalidWebhookSignatureError"; } }

// Provedor padrao: NAO configurado. Nao simula cobranca — falha explicitamente.
class NoopProvider implements PaymentProvider {
  readonly id = "none";
  async createCheckout(): Promise<CheckoutSession> { throw new ProviderNotConfiguredError(); }
  async cancelSubscription(): Promise<void> { throw new ProviderNotConfiguredError(); }
  async refund(): Promise<void> { throw new ProviderNotConfiguredError(); }
  async fetchSubscriptionStatus(): Promise<"unknown"> { throw new ProviderNotConfiguredError(); }
  async verifyAndParseWebhook(): Promise<CanonicalEvent> { throw new ProviderNotConfiguredError(); }
}

export function isProviderConfigured(): boolean {
  return (process.env.PAYMENT_PROVIDER ?? "none") !== "none";
}
