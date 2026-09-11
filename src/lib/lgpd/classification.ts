// Classificacao de dados para o ciclo de vida da conta (LGPD). PURA.
//  - personal: dados pessoais -> anonimizados no encerramento;
//  - financial: registros financeiros/fiscais -> RETIDOS (nao apagados);
//  - security: logs de seguranca/auditoria -> retencao propria (nao apagados no encerramento).
export type DataCategory = "personal" | "financial" | "security";

export const ENTITY_CATEGORY: Record<string, DataCategory> = {
  Customer: "personal", Supplier: "personal", User: "personal",
  Sale: "financial", SaleItem: "financial", Purchase: "financial", PurchaseItem: "financial",
  Payment: "financial", FinanceEntry: "financial", StockMovement: "financial",
  CashRegister: "financial", CashMovement: "financial",
  AuditLog: "security", PlatformAuditLog: "security", WebhookEvent: "security",
  SubscriptionEvent: "security", LgpdRequest: "security",
};

export function dataCategory(entity: string): DataCategory | undefined {
  return ENTITY_CATEGORY[entity];
}
/** So dados pessoais sao anonimizados no encerramento. */
export function isAnonymizedOnDeletion(entity: string): boolean {
  return ENTITY_CATEGORY[entity] === "personal";
}
/** Financeiros e de seguranca sao RETIDOS (nao apagados por "cumprir LGPD"). */
export function isRetainedOnDeletion(entity: string): boolean {
  const c = ENTITY_CATEGORY[entity];
  return c === "financial" || c === "security";
}
