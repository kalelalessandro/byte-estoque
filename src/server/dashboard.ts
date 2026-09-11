import { withTenant } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

export function getDashboardMetrics(tenantId: string) {
  return withTenant(tenantId, async (tx) => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [productCount, customerCount, supplierCount, lowStock, revenue, payable, receivable] = await Promise.all([
      tx.product.count({ where: { deletedAt: null } }),
      tx.customer.count({ where: { deletedAt: null } }),
      tx.supplier.count({ where: { deletedAt: null } }),
      tx.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT count(*)::bigint AS count FROM products WHERE deleted_at IS NULL AND current_stock <= min_stock`,
      ),
      tx.sale.aggregate({ _sum: { total: true }, where: { status: "COMPLETED", createdAt: { gte: monthStart } } }),
      tx.financeEntry.aggregate({ _sum: { amount: true }, where: { type: "PAYABLE", status: "OPEN" } }),
      tx.financeEntry.aggregate({ _sum: { amount: true }, where: { type: "RECEIVABLE", status: "OPEN" } }),
    ]);

    return {
      productCount,
      customerCount,
      supplierCount,
      lowStockCount: Number(lowStock[0]?.count ?? 0),
      revenueMonth: Number(revenue._sum.total ?? 0),
      payableOpen: Number(payable._sum.amount ?? 0),
      receivableOpen: Number(receivable._sum.amount ?? 0),
    };
  });
}
