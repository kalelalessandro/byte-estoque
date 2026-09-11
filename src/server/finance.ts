// Financeiro: contas a pagar/receber. Entradas manuais + as geradas por
// compras (PAYABLE) e vendas a prazo (RECEIVABLE). markPaid quita a conta.
import { withTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import type { FinanceType, FinanceStatus, Prisma } from "@prisma/client";
import type { FinanceEntryInput } from "@/lib/validators/finance";

export function listFinance(
  tenantId: string,
  opts: { type?: FinanceType; status?: FinanceStatus; page?: number; pageSize?: number } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 30));
  const where: Prisma.FinanceEntryWhereInput = {
    ...(opts.type ? { type: opts.type } : {}),
    ...(opts.status ? { status: opts.status } : {}),
  };
  return withTenant(tenantId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.financeEntry.findMany({
        where, orderBy: { dueDate: "asc" }, skip: (page - 1) * pageSize, take: pageSize,
        include: { customer: { select: { name: true } }, supplier: { select: { name: true } } },
      }),
      tx.financeEntry.count({ where }),
    ]);
    return { items, total, page, pageSize };
  });
}

export function createFinanceEntry(tenantId: string, actorId: string, input: FinanceEntryInput) {
  return withTenant(tenantId, async (tx) => {
    const entry = await tx.financeEntry.create({
      data: {
        tenantId, type: input.type, description: input.description, amount: input.amount,
        dueDate: new Date(input.dueDate), status: "OPEN",
        customerId: input.customerId ?? null, supplierId: input.supplierId ?? null, userId: actorId,
      },
    });
    await audit(tx, { tenantId, userId: actorId, action: "finance.create", entity: "FinanceEntry", entityId: entry.id, metadata: { type: input.type, amount: input.amount } });
    return entry;
  });
}

export function markPaid(tenantId: string, actorId: string, id: string) {
  return withTenant(tenantId, async (tx) => {
    const res = await tx.financeEntry.updateMany({ where: { id, status: "OPEN" }, data: { status: "PAID", paidAt: new Date() } });
    if (res.count === 0) throw new Error("NOT_FOUND");
    await audit(tx, { tenantId, userId: actorId, action: "finance.pay", entity: "FinanceEntry", entityId: id });
  });
}

/** Somatorios em aberto para o dashboard. */
export function financeSummary(tenantId: string) {
  return withTenant(tenantId, async (tx) => {
    const [payable, receivable] = await Promise.all([
      tx.financeEntry.aggregate({ _sum: { amount: true }, where: { type: "PAYABLE", status: "OPEN" } }),
      tx.financeEntry.aggregate({ _sum: { amount: true }, where: { type: "RECEIVABLE", status: "OPEN" } }),
    ]);
    return {
      payableOpen: Number(payable._sum.amount ?? 0),
      receivableOpen: Number(receivable._sum.amount ?? 0),
    };
  });
}
