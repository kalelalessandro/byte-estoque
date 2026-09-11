// Notificacoes. Padrao transactional-outbox: a operacao de negocio grava a
// notificacao in-app (RLS) e um item no outbox (tabela de plataforma) — ambos
// sao WRITES no banco, nunca um envio externo. O worker envia depois.
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";
import { emailIdempotencyKey } from "@/lib/email/retry";
import type { EmailTemplate } from "@/lib/email/templates";

export function createNotification(tenantId: string, n: { userId?: string | null; type: string; title: string; body: string }) {
  return withTenant(tenantId, (tx) => tx.notification.create({ data: { tenantId, userId: n.userId ?? null, type: n.type, title: n.title, body: n.body } }));
}

/** Enfileira e-mail (idempotente por chave). Best-effort: NUNCA lanca. */
export async function enqueueEmail(args: { tenantId?: string; toEmail: string; template: EmailTemplate; payload: Record<string, string | number>; idempotencyKey: string }): Promise<boolean> {
  try {
    await prisma.emailOutbox.create({ data: { tenantId: args.tenantId ?? null, toEmail: args.toEmail, template: args.template, payload: args.payload, idempotencyKey: args.idempotencyKey } });
    return true;
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique")) return false; // ja enfileirado (idempotencia)
    console.error("[notify] falha ao enfileirar e-mail:", e instanceof Error ? e.message : e);
    return false;
  }
}

// Resolve o e-mail do OWNER + preferencia e enfileira (respeitando a pref). Best-effort.
async function dispatchOwnerEmail(tenantId: string, template: EmailTemplate, payload: Record<string, string | number>, idemParts: (string | number)[], pref: "emailBilling" | "emailLowStock") {
  try {
    const owner = await prisma.user.findFirst({ where: { tenantId, role: "OWNER" }, select: { id: true, email: true } });
    if (!owner) return;
    const p = await withTenant(tenantId, (tx) => tx.notificationPreference.findUnique({ where: { tenantId_userId: { tenantId, userId: owner.id } } }));
    if (p && p[pref] === false) return; // usuario desabilitou esse tipo
    await enqueueEmail({ tenantId, toEmail: owner.email, template, payload, idempotencyKey: emailIdempotencyKey([tenantId, template, ...idemParts]) });
  } catch (e) {
    console.error("[notify] dispatchOwnerEmail:", e instanceof Error ? e.message : e);
  }
}

// ---- Eventos de alto nivel (chamados APOS a operacao de negocio) ----
export async function notifyLowStock(tenantId: string, d: { productName: string; balance: number; min: number }) {
  await createNotification(tenantId, { type: "low_stock", title: "Estoque baixo", body: `${d.productName}: saldo ${d.balance} (minimo ${d.min}).` }).catch(() => {});
  await dispatchOwnerEmail(tenantId, "low_stock", { product: d.productName, balance: d.balance, min: d.min }, ["lowstock", d.productName, d.balance], "emailLowStock");
}
export async function notifyBilling(tenantId: string, template: EmailTemplate, title: string, body: string, payload: Record<string, string | number>, idemParts: (string | number)[]) {
  await createNotification(tenantId, { type: template, title, body }).catch(() => {});
  await dispatchOwnerEmail(tenantId, template, payload, idemParts, "emailBilling");
}

// ---- Leitura/gestao (tenant, RLS) ----
export function listNotifications(tenantId: string, userId: string, limit = 50) {
  return withTenant(tenantId, (tx) => tx.notification.findMany({ where: { OR: [{ userId: null }, { userId }] }, orderBy: { createdAt: "desc" }, take: limit }));
}
export function unreadCount(tenantId: string, userId: string) {
  return withTenant(tenantId, (tx) => tx.notification.count({ where: { readAt: null, OR: [{ userId: null }, { userId }] } }));
}
export function markRead(tenantId: string, userId: string, id: string) {
  return withTenant(tenantId, (tx) => tx.notification.updateMany({ where: { id, OR: [{ userId: null }, { userId }] }, data: { readAt: new Date() } }));
}
export function markAllRead(tenantId: string, userId: string) {
  return withTenant(tenantId, (tx) => tx.notification.updateMany({ where: { readAt: null, OR: [{ userId: null }, { userId }] }, data: { readAt: new Date() } }));
}
export function getPreferences(tenantId: string, userId: string) {
  return withTenant(tenantId, (tx) => tx.notificationPreference.upsert({ where: { tenantId_userId: { tenantId, userId } }, create: { tenantId, userId }, update: {} }));
}
export function setPreferences(tenantId: string, userId: string, data: { emailBilling: boolean; emailLowStock: boolean }) {
  return withTenant(tenantId, (tx) => tx.notificationPreference.upsert({ where: { tenantId_userId: { tenantId, userId } }, create: { tenantId, userId, ...data }, update: data }));
}
