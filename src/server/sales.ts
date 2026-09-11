// Vendas/PDV. Uma venda e criada COMPLETED e, na MESMA transacao:
//  - baixa o estoque de cada item (saida a prova de corrida);
//  - se qualquer item nao tiver saldo, TUDO e desfeito (sem venda parcial);
//  - registra a venda e os itens;
//  - se pagamento CREDIT (a prazo), gera conta a receber (vencimento +30 dias);
//  - registra auditoria.
// Cancelar devolve o estoque e cancela a conta a receber vinculada.
import { withTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { postMovementTx, InsufficientStockError } from "@/server/stock";
import { resolveBranchIdTx } from "@/server/branches";
import { recordCashSaleTx } from "@/server/cash";
import { lineTotal, docTotal } from "@/lib/money";
import type { SaleInput } from "@/lib/validators/sale";

export { InsufficientStockError };

export function listSales(tenantId: string, opts: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  return withTenant(tenantId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.sale.findMany({
        orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
        include: { customer: { select: { name: true } }, _count: { select: { items: true } } },
      }),
      tx.sale.count(),
    ]);
    return { items, total, page, pageSize };
  });
}

export function createSale(tenantId: string, actorId: string, input: SaleInput) {
  return withTenant(tenantId, async (tx) => {
    const ids = [...new Set(input.items.map((i) => i.productId))];
    const products = await tx.product.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true } });
    if (products.length !== ids.length) throw new Error("NOT_FOUND");

    const branchId = await resolveBranchIdTx(tx, tenantId, input.branchId);
    const lines = input.items.map((i) => lineTotal(i.quantity, i.unitPrice));
    const subtotal = docTotal(lines);
    const total = docTotal(lines, { sub: input.discount });

    const sale = await tx.sale.create({
      data: { tenantId, customerId: input.customerId ?? null, branchId, status: "COMPLETED", subtotal, discount: input.discount, total, paymentMethod: input.paymentMethod, userId: actorId },
    });

    for (let idx = 0; idx < input.items.length; idx++) {
      const it = input.items[idx];
      await tx.saleItem.create({ data: { tenantId, saleId: sale.id, productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice, total: lines[idx] } });
      // Baixa de estoque a prova de corrida; falta de saldo desfaz a venda toda.
      await postMovementTx(tx, { tenantId, actorId, productId: it.productId, branchId, type: "EXIT", quantity: it.quantity, reason: `Venda ${sale.id.slice(0, 8)}` });
    }

    if (input.paymentMethod === "CREDIT") {
      const due = new Date();
      due.setDate(due.getDate() + 30);
      await tx.financeEntry.create({
        data: { tenantId, type: "RECEIVABLE", description: `Venda a prazo ${sale.id.slice(0, 8)}`, amount: total, dueDate: due, customerId: input.customerId ?? null, saleId: sale.id, userId: actorId },
      });
    }

    // Venda em dinheiro entra no caixa aberto (se houver), na mesma transacao.
    if (input.paymentMethod === "CASH") {
      await recordCashSaleTx(tx, tenantId, actorId, sale.id, total, branchId);
    }

    await audit(tx, { tenantId, userId: actorId, action: "sale.create", entity: "Sale", entityId: sale.id, metadata: { total, method: input.paymentMethod } });
    return sale;
  });
}

export function cancelSale(tenantId: string, actorId: string, id: string) {
  return withTenant(tenantId, async (tx) => {
    const sale = await tx.sale.findFirst({ where: { id, status: "COMPLETED" }, include: { items: true } });
    if (!sale) throw new Error("NOT_FOUND");
    for (const it of sale.items) {
      // Devolve o estoque (entrada) na filial da venda.
      await postMovementTx(tx, { tenantId, actorId, productId: it.productId, branchId: sale.branchId, type: "ENTRY", quantity: Number(it.quantity), reason: `Cancelamento venda ${id.slice(0, 8)}` });
    }
    await tx.financeEntry.updateMany({ where: { saleId: id, status: "OPEN" }, data: { status: "CANCELED" } });
    // Remove a entrada de caixa da venda se o caixa ainda estiver aberto.
    const cashMv = await tx.cashMovement.findFirst({ where: { saleId: id }, include: { register: { select: { status: true } } } });
    if (cashMv && cashMv.register.status === "OPEN") await tx.cashMovement.delete({ where: { id: cashMv.id } });
    await tx.sale.update({ where: { id }, data: { status: "CANCELED" } });
    await audit(tx, { tenantId, userId: actorId, action: "sale.cancel", entity: "Sale", entityId: id });
  });
}
