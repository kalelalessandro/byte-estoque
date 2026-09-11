// Compras. Uma compra e criada COMPLETED e, na MESMA transacao:
//  - valida que os produtos sao do tenant;
//  - da entrada no estoque (postMovementTx) de cada item;
//  - se houver vencimento, gera uma conta a pagar (FinanceEntry PAYABLE);
//  - registra auditoria.
// Cancelar reverte o estoque (saida) e cancela a conta a pagar vinculada.
import { withTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { postMovementTx, InsufficientStockError } from "@/server/stock";
import { resolveBranchIdTx } from "@/server/branches";
import { lineTotal, docTotal } from "@/lib/money";
import type { PurchaseInput } from "@/lib/validators/purchase";

export function listPurchases(tenantId: string, opts: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  return withTenant(tenantId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.purchase.findMany({
        orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
        include: { supplier: { select: { name: true } }, _count: { select: { items: true } } },
      }),
      tx.purchase.count(),
    ]);
    return { items, total, page, pageSize };
  });
}

export function createPurchase(tenantId: string, actorId: string, input: PurchaseInput) {
  return withTenant(tenantId, async (tx) => {
    const ids = [...new Set(input.items.map((i) => i.productId))];
    const products = await tx.product.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true } });
    if (products.length !== ids.length) throw new Error("NOT_FOUND");

    const branchId = await resolveBranchIdTx(tx, tenantId, input.branchId);
    const lines = input.items.map((i) => lineTotal(i.quantity, i.unitCost));
    const total = docTotal(lines, { add: input.freight, sub: input.discount });

    const purchase = await tx.purchase.create({
      data: {
        tenantId, supplierId: input.supplierId ?? null, branchId, status: "COMPLETED",
        freight: input.freight, discount: input.discount, total,
        dueDate: input.dueDate ? new Date(input.dueDate) : null, userId: actorId,
      },
    });

    for (let idx = 0; idx < input.items.length; idx++) {
      const it = input.items[idx];
      await tx.purchaseItem.create({
        data: { tenantId, purchaseId: purchase.id, productId: it.productId, quantity: it.quantity, unitCost: it.unitCost, total: lines[idx] },
      });
      await postMovementTx(tx, { tenantId, actorId, productId: it.productId, branchId, type: "ENTRY", quantity: it.quantity, reason: `Compra ${purchase.id.slice(0, 8)}` });
    }

    if (input.dueDate) {
      await tx.financeEntry.create({
        data: { tenantId, type: "PAYABLE", description: `Compra ${purchase.id.slice(0, 8)}`, amount: total, dueDate: new Date(input.dueDate), supplierId: input.supplierId ?? null, purchaseId: purchase.id, userId: actorId },
      });
    }

    await audit(tx, { tenantId, userId: actorId, action: "purchase.create", entity: "Purchase", entityId: purchase.id, metadata: { total, items: input.items.length } });
    return purchase;
  });
}

export function cancelPurchase(tenantId: string, actorId: string, id: string) {
  return withTenant(tenantId, async (tx) => {
    const purchase = await tx.purchase.findFirst({ where: { id, status: "COMPLETED" }, include: { items: true } });
    if (!purchase) throw new Error("NOT_FOUND");
    const branchId = purchase.branchId;

    // Reverte o estoque (saida). Se algum item ja foi consumido, a saida falha
    // e a transacao inteira e desfeita — nao deixamos o cancelamento pela metade.
    for (const it of purchase.items) {
      try {
        await postMovementTx(tx, { tenantId, actorId, productId: it.productId, branchId, type: "EXIT", quantity: Number(it.quantity), reason: `Cancelamento compra ${id.slice(0, 8)}` });
      } catch (e) {
        if (e instanceof InsufficientStockError) throw new Error("CANNOT_CANCEL_STOCK_CONSUMED");
        throw e;
      }
    }
    await tx.financeEntry.updateMany({ where: { purchaseId: id, status: "OPEN" }, data: { status: "CANCELED" } });
    await tx.purchase.update({ where: { id }, data: { status: "CANCELED" } });
    await audit(tx, { tenantId, userId: actorId, action: "purchase.cancel", entity: "Purchase", entityId: id });
  });
}
