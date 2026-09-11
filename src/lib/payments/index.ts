import type { PaymentProvider } from "./provider";
import { MercadoPagoProvider } from "./mercadopago";

class NoopProvider implements PaymentProvider {
  readonly id = "none";
  async createCheckout(): Promise<never> { throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED"); }
  async cancelSubscription(): Promise<never> { throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED"); }
  async refund(): Promise<never> { throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED"); }
  async fetchSubscriptionStatus(): Promise<never> { throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED"); }
  async verifyAndParseWebhook(): Promise<never> { throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED"); }
}

export function getPaymentProvider(): PaymentProvider {
  switch (process.env.PAYMENT_PROVIDER) {
    case "mercadopago": return new MercadoPagoProvider();
    default: return new NoopProvider();
  }
}
export { isProviderConfigured } from "./provider";
export type { PaymentProvider } from "./provider";
