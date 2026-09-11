// Mapeamento PURO status do gateway -> intencao canonica do dominio.

export type WebhookIntent =
  | "paid"
  | "payment_failed"
  | "canceled"
  | "ignore";

export function mpPreapprovalStatusToIntent(status: string): WebhookIntent {
  switch (status) {
    case "authorized":
      return "paid";
    case "paused":
      return "payment_failed";
    case "cancelled":
      return "canceled";
    default:
      return "ignore";
  }
}

export function mpPaymentStatusToIntent(status: string): WebhookIntent {
  switch (status) {
    case "approved":
      return "paid";
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "payment_failed";
    default:
      return "ignore";
  }
}