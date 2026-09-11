// LGPD. Exportacao (JSON, RLS), encerramento de conta com anonimizacao dos dados
// PESSOAIS e RETENCAO dos registros financeiros/fiscais e de seguranca. Tudo
// auditado. Autorizacao (lgpd:manage) e checada nas actions/route.
import { withTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { anonymizedCustomerFields, anonymizedSupplierFields, anonymizedUserFields } from "@/lib/lgpd/anonymize";

export async function exportTenantData(tenantId: string) {
  return withTenant(tenantId, async (tx) => {
    const [tenant, products, customers, suppliers, branches, sales, purchases, finance, payments, subscription, stocks, consents] = await Promise.all([
      tx.tenant.findUnique({ where: { id: tenantId }, select: { name: true, cnpj: true, phone: true, addressLine: true, plan: true, createdAt: true } }),
      tx.product.findMany({ where: { deletedAt: null } }),
      tx.customer.findMany({ where: { deletedAt: null } }),
      tx.supplier.findMany({ where: { deletedAt: null } }),
      tx.branch.findMany(),
      tx.sale.findMany({ include: { items: true } }),
      tx.purchase.findMany({ include: { items: true } }),
      tx.financeEntry.findMany(),
      tx.payment.findMany({ select: { id: true, provider: true, providerRef: true, method: true, amount: true, status: true, createdAt: true } }),
      tx.subscription.findUnique({ where: { tenantId } }),
      tx.productStock.findMany(),
      tx.consentRecord.findMany(),
    ]);
    return { exportedAt: new Date().toISOString(), tenant, products, customers, suppliers, branches, sales, purchases, finance, payments, subscription, stocks, consents };
  });
}

export function requestExport(tenantId: string, userId: string) {
  return withTenant(tenantId, async (tx) => {
    await tx.lgpdRequest.create({ data: { tenantId, userId, type: "EXPORT", status: "COMPLETED", completedAt: new Date() } });
    await audit(tx, { tenantId, userId, action: "lgpd.export", entity: "LgpdRequest" });
  });
}

export type CloseResult = { anonymizedCustomers: number; anonymizedSuppliers: number; anonymizedUsers: number; retained: string[] };

export function closeAccount(tenantId: string, userId: string): Promise<CloseResult> {
  return withTenant(tenantId, async (tx) => {
    // 1) Anonimiza dados PESSOAIS (clientes, fornecedores, usuarios).
    const c = await tx.customer.updateMany({ where: {}, data: anonymizedCustomerFields() });
    const s = await tx.supplier.updateMany({ where: {}, data: anonymizedSupplierFields() });
    const users = await tx.user.findMany({ where: { tenantId }, select: { id: true } });
    for (const u of users) await tx.user.update({ where: { id: u.id }, data: anonymizedUserFields(u.id) });

    // 2) NAO apaga registros financeiros/fiscais nem logs de seguranca (retidos).
    // 3) Encerra a conta e cancela a assinatura (bloqueia o acesso pelo gate).
    await tx.tenant.update({ where: { id: tenantId }, data: { closedAt: new Date() } });
    await tx.subscription.updateMany({ where: { tenantId }, data: { status: "CANCELED", canceledAt: new Date() } });

    await tx.lgpdRequest.create({ data: { tenantId, userId, type: "DELETE_ACCOUNT", status: "COMPLETED", completedAt: new Date() } });
    await audit(tx, { tenantId, userId, action: "lgpd.close_account", entity: "Tenant", entityId: tenantId, metadata: { anonymizedUsers: users.length } });

    return { anonymizedCustomers: c.count, anonymizedSuppliers: s.count, anonymizedUsers: users.length, retained: ["Sale", "Purchase", "Payment", "FinanceEntry", "StockMovement", "CashRegister", "AuditLog"] };
  });
}

export function recordConsent(tenantId: string, userId: string | null, type: string, granted: boolean, version: string) {
  return withTenant(tenantId, async (tx) => {
    const r = await tx.consentRecord.create({ data: { tenantId, userId, type, granted, version } });
    await audit(tx, { tenantId, userId: userId ?? undefined, action: "lgpd.consent", entity: "ConsentRecord", entityId: r.id, metadata: { type, granted } });
    return r;
  });
}

export function listConsents(tenantId: string) {
  return withTenant(tenantId, (tx) => tx.consentRecord.findMany({ orderBy: { createdAt: "desc" }, take: 50 }));
}
export function listLgpdRequests(tenantId: string) {
  return withTenant(tenantId, (tx) => tx.lgpdRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50 }));
}
