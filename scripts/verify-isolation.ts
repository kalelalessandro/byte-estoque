// Prova de isolamento de tenant em TODAS as tabelas de negocio (multi-filial).
import { PrismaClient, type Prisma } from "@prisma/client";
const prisma = new PrismaClient();
function withTenant<T>(tenantId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
function withPlatform<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.platform', 'on', true)`;
    return fn(tx);
  });
}
async function main() {
  const a = await prisma.tenant.create({ data: { name: "ISO A", slug: `iso-a-${Date.now()}` } });
  const b = await prisma.tenant.create({ data: { name: "ISO B", slug: `iso-b-${Date.now()}` } });

  await withTenant(a.id, async (tx) => {
    const branch = await tx.branch.create({ data: { tenantId: a.id, name: "Matriz", isDefault: true } });
    const p = await tx.product.create({ data: { tenantId: a.id, sku: "A-1", name: "Produto A", currentStock: 10 } });
    await tx.productStock.create({ data: { tenantId: a.id, productId: p.id, branchId: branch.id, quantity: 10 } });
    await tx.customer.create({ data: { tenantId: a.id, name: "Cliente A" } });
    await tx.supplier.create({ data: { tenantId: a.id, name: "Fornecedor A" } });
    await tx.stockMovement.create({ data: { tenantId: a.id, productId: p.id, branchId: branch.id, type: "ENTRY", quantity: 10, balance: 10 } });
    const pur = await tx.purchase.create({ data: { tenantId: a.id, branchId: branch.id, total: 100 } });
    await tx.purchaseItem.create({ data: { tenantId: a.id, purchaseId: pur.id, productId: p.id, quantity: 1, unitCost: 100, total: 100 } });
    const sale = await tx.sale.create({ data: { tenantId: a.id, branchId: branch.id, total: 50, paymentMethod: "CASH" } });
    await tx.saleItem.create({ data: { tenantId: a.id, saleId: sale.id, productId: p.id, quantity: 1, unitPrice: 50, total: 50 } });
    await tx.financeEntry.create({ data: { tenantId: a.id, type: "RECEIVABLE", description: "x", amount: 50, dueDate: new Date() } });
    const reg = await tx.cashRegister.create({ data: { tenantId: a.id, branchId: branch.id, openingBalance: 100 } });
    await tx.cashMovement.create({ data: { tenantId: a.id, registerId: reg.id, type: "SALE", amount: 50 } });
    await tx.subscription.create({ data: { tenantId: a.id, currentPeriodEnd: new Date(Date.now() + 86400000) } });
  });
  await withTenant(b.id, (tx) => tx.branch.create({ data: { tenantId: b.id, name: "Matriz", isDefault: true } }));

  const leaks = await withTenant(b.id, async (tx) => ({
    branches: (await tx.branch.findMany()).some((x) => x.tenantId === a.id),
    products: await tx.product.count(),
    productStocks: await tx.productStock.count(),
    customers: await tx.customer.count(),
    suppliers: (await tx.supplier.findMany()).some((x) => x.tenantId === a.id),
    movements: await tx.stockMovement.count(),
    purchases: await tx.purchase.count(),
    purchaseItems: await tx.purchaseItem.count(),
    sales: await tx.sale.count(),
    saleItems: await tx.saleItem.count(),
    finance: await tx.financeEntry.count(),
    cashRegisters: await tx.cashRegister.count(),
    cashMovements: await tx.cashMovement.count(),
  }));
  // Fronteira do bypass de plataforma: com app.platform='on', tabelas admin ficam
  // visiveis, mas tabelas OPERACIONAIS continuam invisiveis (grupo tenant-only).
  const platform = await withPlatform(async (tx) => ({
    subscriptionsVisible: await tx.subscription.count(),   // deve ser >= 1
    productsVisibleToPlatform: await tx.product.count(),   // DEVE ser 0 (sem bypass)
    customersVisibleToPlatform: await tx.customer.count(), // DEVE ser 0
  }));

  await prisma.tenant.deleteMany({ where: { id: { in: [a.id, b.id] } } });

  if (platform.productsVisibleToPlatform > 0 || platform.customersVisibleToPlatform > 0) {
    throw new Error(`FALHA: plataforma acessou dados OPERACIONAIS -> ${JSON.stringify(platform)}`);
  }
  if (platform.subscriptionsVisible < 1) {
    throw new Error("FALHA: bypass de plataforma nao habilitou leitura das assinaturas");
  }
  console.log("OK: bypass de plataforma ve assinaturas mas NAO ve produtos/clientes.");

  const leaked = Object.entries(leaks).some(([, v]) => (typeof v === "boolean" ? v : v > 0));
  if (leaked) throw new Error(`FALHA: vazamento detectado -> ${JSON.stringify(leaks)}`);
  console.log("OK: tenant B nao acessa nenhum dado de negocio do tenant A (todas as tabelas, incl. filiais e estoques).");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
