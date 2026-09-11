// Prova de que o estoque POR FILIAL e a prova de corrida.
// Produto com 10 na filial; 20 saidas de 1 em paralelo -> 10 sucessos, saldo 0.
import { PrismaClient, type Prisma } from "@prisma/client";
const prisma = new PrismaClient();
function withTenant<T>(tenantId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
async function exit(tenantId: string, productId: string, branchId: string, qty: number) {
  return withTenant(tenantId, async (tx) => {
    const r = await tx.productStock.updateMany({ where: { productId, branchId, quantity: { gte: qty } }, data: { quantity: { decrement: qty } } });
    if (r.count === 0) throw new Error("INSUFFICIENT");
  });
}
async function main() {
  const t = await prisma.tenant.create({ data: { name: "CONC", slug: `conc-${Date.now()}` } });
  const { pId, bId } = await withTenant(t.id, async (tx) => {
    const branch = await tx.branch.create({ data: { tenantId: t.id, name: "Matriz", isDefault: true } });
    const p = await tx.product.create({ data: { tenantId: t.id, sku: "C-1", name: "Conc", currentStock: 10 } });
    await tx.productStock.create({ data: { tenantId: t.id, productId: p.id, branchId: branch.id, quantity: 10 } });
    return { pId: p.id, bId: branch.id };
  });
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => exit(t.id, pId, bId, 1)));
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const final = await withTenant(t.id, (tx) => tx.productStock.findFirst({ where: { productId: pId, branchId: bId }, select: { quantity: true } }));
  await prisma.tenant.deleteMany({ where: { id: t.id } });
  const balance = Number(final?.quantity ?? -1);
  console.log(`sucessos=${ok} saldo_final=${balance}`);
  if (ok !== 10 || balance !== 0) throw new Error("FALHA: condicao de corrida no estoque por filial!");
  console.log("OK: sem oversell por filial mesmo com 20 saidas simultaneas.");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
