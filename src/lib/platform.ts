// Logica PURA da plataforma (sem DB). Autoridade separada do RBAC de tenant +
// serializadores que fazem WHITELIST de campos — garantia estrutural de que
// segredos/payloads nunca vazam nas respostas da API de plataforma.
import type { UserRole } from "@prisma/client";

/** Unica fonte de verdade da autoridade de plataforma. */
export function isPlatformAdmin(role: UserRole | undefined | null): boolean {
  return role === "PLATFORM_ADMIN";
}

/** Um admin de TENANT nunca pode atribuir o papel de plataforma (anti-escalada). */
export function assignableByTenantAdmin(role: UserRole): boolean {
  return role !== "PLATFORM_ADMIN";
}

// ---- Serializadores (whitelist explicito) ----
export function publicTenantRow(t: { id: string; name: string; slug: string; plan?: string | null; status?: string | null; createdAt: Date }) {
  return { id: t.id, name: t.name, slug: t.slug, plan: t.plan ?? null, status: t.status ?? null, createdAt: t.createdAt };
}
export function publicPaymentRow(p: { id: string; provider: string; providerRef: string | null; method: string | null; amount: unknown; status: string; createdAt: Date; tenantName?: string | null }) {
  return { id: p.id, tenant: p.tenantName ?? null, provider: p.provider, providerRef: p.providerRef ?? null, method: p.method ?? null, amount: Number(p.amount), status: p.status, createdAt: p.createdAt };
}
export function publicWebhookRow(e: { id: string; provider: string; externalId: string; type: string; status: string; error: string | null; createdAt: Date }) {
  // NOTE: 'payload' e deliberadamente OMITIDO (pode conter PII/dados do gateway).
  return { id: e.id, provider: e.provider, externalId: e.externalId, type: e.type, status: e.status, error: e.error ?? null, createdAt: e.createdAt };
}
