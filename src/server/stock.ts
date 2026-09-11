// Motor de estoque MULTI-FILIAL. O saldo real vive em ProductStock por
// (produto, filial); Product.currentStock e o TOTAL denormalizado, mantido em
// sincronia na mesma transacao. A trava de concorrencia (UPDATE condicional
// quantity >= qtd) fica no saldo da FILIAL, impedindo oversell por filial.
import type { Prisma, StockMovementType } from "@prisma/client";
import { withTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { resolveBranchIdTx } from "@/server/branches";

export class InsufficientStockError extends Error {
  constructor() { super("INSUFFICIENT_STOCK"); this.name = "InsufficientStockError"; }
}

/** Aplica um movimento numa filial e devolve o saldo resultante DA FILIAL. Nao audita. */
export async function postMovementTx(
  tx: Prisma.TransactionClient,
  args: { tenantId: string; actorId?: string | null; productId: string; branchId: string; type: StockMovementType; quantity: number; reason?: string | null },
): Promise<Prisma.Decimal> {
  const { tenantId, productId, branchId, type, quantity: qty } = args;
  const key = { productId_branchId: { productId, branchId } };

  // Garante a linha de estoque da filial.
  await tx.productStock.upsert({ where: key, create: { tenantId, productId, branchId, quantity: 0 }, update: {} });

  if (type === "ENTRY") {
    await tx.productStock.update({ where: key, data: { quantity: { increment: qty } } });
    await tx.product.update({ where: { id: productId }, data: { currentStock: { increment: qty } } });
  } else if (type === "EXIT") {
    const r = await tx.productStock.updateMany({ where: { productId, branchId, quantity: { gte: qty } }, data: { quantity: { decrement: qty } } });
    if (r.count === 0) throw new InsufficientStockError();
    await tx.product.update({ where: { id: productId }, data: { currentStock: { decrement: qty } } });
  } else {
    const ps = await tx.productStock.findUnique({ where: key, select: { quantity: true } });
    const delta = qty - Number(ps!.quantity);
    await tx.productStock.update({ where: key, data: { quantity: qty } });
    await tx.product.update({ where: { id: productId }, data: { currentStock: { increment: delta } } });
  }

  const after = await tx.productStock.findUnique({ where: key, select: { quantity: true } });
  const balance = after!.quantity;
  await tx.stockMovement.create({
    data: { tenantId, productId, branchId, type, quantity: qty, balance, reason: args.reason ?? null, userId: args.actorId ?? null },
  });
  return balance;
}

export function recordMovement(
  tenantId: string,
  actorId: string,
  input: { productId: string; type: StockMovementType; quantity: number; reason?: string; branchId?: string },
) {
  return withTenant(tenantId, async (tx) => {
    const product = await tx.product.findFirst({ where: { id: input.productId, deletedAt: null }, select: { id: true, name: true, minStock: true } });
    if (!product) throw new Error("NOT_FOUND");
    const branchId = await resolveBranchIdTx(tx, tenantId, input.branchId);
    const balance = await postMovementTx(tx, { tenantId, actorId, productId: product.id, branchId, type: input.type, quantity: input.quantity, reason: input.reason });
    await audit(tx, { tenantId, userId: actorId, action: `stock.${input.type.toLowerCase()}`, entity: "StockMovement", entityId: product.id, metadata: { quantity: input.quantity, branchId } });
    const min = Number(product.minStock);
    return { balance, lowStock: Number(balance) <= min, productName: product.name, min };
  });
}

export function listMovements(tenantId: string, opts: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 30));
  return withTenant(tenantId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.stockMovement.findMany({
        orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
        include: { product: { select: { name: true, sku: true } }, branch: { select: { name: true } } },
      }),
      tx.stockMovement.count(),
    ]);
    return { items, total, page, pageSize };
  });
}
