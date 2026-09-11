// Camada de dados do modulo Produtos (tenant-agnostica; recebe tenantId).
import { withTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { assertWithinLimit } from "@/lib/entitlements";
import { getDefaultBranchIdTx } from "@/server/branches";
import type { ProductInput } from "@/lib/validators/product";

function normalize(input: ProductInput) {
  return {
    sku: input.sku,
    name: input.name,
    barcode: input.barcode || null,
    brand: input.brand || null,
    category: input.category || null,
    unit: input.unit,
    costPrice: input.costPrice,
    salePrice: input.salePrice,
    minStock: input.minStock,
    maxStock: input.maxStock,
    currentStock: input.currentStock,
    status: input.status,
  };
}

export function listProducts(tenantId: string) {
  return withTenant(tenantId, (tx) =>
    tx.product.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } }),
  );
}

export function createProduct(tenantId: string, actorId: string, input: ProductInput) {
  return withTenant(tenantId, async (tx) => {
    await assertWithinLimit(tx, tenantId, "products"); // respeita o plano
    const product = await tx.product.create({ data: { ...normalize(input), tenantId } });
    // Semeia o estoque inicial na filial padrao (fonte por filial = ProductStock).
    const branchId = await getDefaultBranchIdTx(tx, tenantId);
    await tx.productStock.create({
      data: { tenantId, productId: product.id, branchId, quantity: input.currentStock, minStock: input.minStock, maxStock: input.maxStock },
    });
    await audit(tx, {
      tenantId, userId: actorId, action: "product.create", entity: "Product",
      entityId: product.id, metadata: { sku: product.sku },
    });
    return product;
  });
}

export function updateProduct(tenantId: string, actorId: string, id: string, input: ProductInput) {
  return withTenant(tenantId, async (tx) => {
    const res = await tx.product.updateMany({ where: { id, deletedAt: null }, data: normalize(input) });
    if (res.count === 0) throw new Error("NOT_FOUND");
    await audit(tx, { tenantId, userId: actorId, action: "product.update", entity: "Product", entityId: id });
  });
}

export function softDeleteProduct(tenantId: string, actorId: string, id: string) {
  return withTenant(tenantId, async (tx) => {
    const res = await tx.product.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
    if (res.count === 0) throw new Error("NOT_FOUND");
    await audit(tx, { tenantId, userId: actorId, action: "product.delete", entity: "Product", entityId: id });
  });
}
