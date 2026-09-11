// Servico do SUPER-ADMIN. Toda funcao pressupoe requirePlatformAdmin() ja checado
// na action/route. Usa withPlatform() (bypass de RLS SO nas tabelas admin) e nunca
// toca dados operacionais dos tenants. Serializadores fazem whitelist de campos.
import { prisma } from "@/lib/prisma";
import { withPlatform } from "@/lib/tenant";
import { publicTenantRow, publicPaymentRow, publicWebhookRow } from "@/lib/platform";
import { PLAN_CATALOG } from "@/lib/plans";

function logPlatformAudit(actorUserId: string, action: string, targetTenantId?: string, metadata?: object) {
  return prisma.platformAuditLog.create({ data: { actorUserId, action, targetTenantId: targetTenantId ?? null, metadata } });
}

export async function platformMetrics() {
  const tenants = await prisma.tenant.count();
  const webhookByStatus = await prisma.webhookEvent.groupBy({ by: ["status"], _count: true });
  const { subsByStatus, approvedSum } = await withPlatform(async (tx) => {
    const subsByStatus = await tx.subscription.groupBy({ by: ["status"], _count: true });
    const approved = await tx.payment.aggregate({ _sum: { amount: true }, where: { status: "APPROVED" } });
    return { subsByStatus, approvedSum: Number(approved._sum.amount ?? 0) };
  });
  const statusMap: Record<string, number> = {};
  for (const r of subsByStatus) statusMap[r.status] = r._count;
  const webhookMap: Record<string, number> = {};
  for (const r of webhookByStatus) webhookMap[r.status] = r._count;
  return { tenants, subscriptions: statusMap, approvedTotal: approvedSum, webhooks: webhookMap };
}

export async function listPlatformTenants(opts: { search?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  const where = opts.search ? { OR: [{ name: { contains: opts.search, mode: "insensitive" as const } }, { slug: { contains: opts.search, mode: "insensitive" as const } }] } : {};
  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.tenant.count({ where }),
  ]);
  const subs = await withPlatform((tx) => tx.subscription.findMany({ where: { tenantId: { in: tenants.map((t) => t.id) } }, select: { tenantId: true, plan: true, status: true } }));
  const byTenant = new Map<string, { tenantId: string; plan: string; status: string }>(subs.map((s) => [s.tenantId, s]));
  return {
    items: tenants.map((t) => publicTenantRow({ ...t, plan: byTenant.get(t.id)?.plan ?? null, status: byTenant.get(t.id)?.status ?? null })),
    total, page, pageSize,
  };
}

export async function listPlatformPayments(opts: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 30));
  const rows = await withPlatform((tx) => tx.payment.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { tenant: { select: { name: true } } } }));
  return rows.map((p) => publicPaymentRow({ ...p, tenantName: p.tenant?.name ?? null }));
}

export async function listPlatformWebhooks(opts: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 40));
  // Seleciona SO campos nao sensiveis (sem payload).
  const rows = await prisma.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, provider: true, externalId: true, type: true, status: true, error: true, createdAt: true } });
  return rows.map(publicWebhookRow);
}

export function listPlatformAudit(opts: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 40));
  return prisma.platformAuditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize });
}

export async function suspendTenant(actorUserId: string, tenantId: string) {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!t) throw new Error("TENANT_NOT_FOUND");
  await withPlatform(async (tx) => {
    await tx.subscription.updateMany({ where: { tenantId }, data: { status: "SUSPENDED" } });
    await tx.subscriptionEvent.create({ data: { tenantId, type: "status_changed", toStatus: "SUSPENDED", metadata: { source: "platform_admin" } } });
  });
  await logPlatformAudit(actorUserId, "tenant.suspend", tenantId);
}

export async function reactivateTenant(actorUserId: string, tenantId: string) {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!t) throw new Error("TENANT_NOT_FOUND");
  await withPlatform(async (tx) => {
    await tx.subscription.updateMany({ where: { tenantId }, data: { status: "ACTIVE" } });
    await tx.subscriptionEvent.create({ data: { tenantId, type: "status_changed", toStatus: "ACTIVE", metadata: { source: "platform_admin" } } });
  });
  await logPlatformAudit(actorUserId, "tenant.reactivate", tenantId);
}

export { PLAN_CATALOG };
