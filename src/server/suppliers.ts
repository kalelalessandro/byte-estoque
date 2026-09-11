// Camada de dados do modulo Fornecedores (RLS + auditoria + limite de plano).
import { withTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { assertWithinLimit } from "@/lib/entitlements";
import type { SupplierInput } from "@/lib/validators/supplier";

function normalize(input: SupplierInput) {
  return {
    name: input.name,
    document: input.document || null,
    email: input.email || null,
    phone: input.phone || null,
    addressLine: input.addressLine || null,
    notes: input.notes || null,
  };
}

export function listSuppliers(
  tenantId: string,
  opts: { search?: string; page?: number; pageSize?: number } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const search = opts.search?.trim();
  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { document: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  return withTenant(tenantId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.supplier.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
      tx.supplier.count({ where }),
    ]);
    return { items, total, page, pageSize };
  });
}

export function createSupplier(tenantId: string, actorId: string, input: SupplierInput) {
  return withTenant(tenantId, async (tx) => {
    await assertWithinLimit(tx, tenantId, "suppliers");
    const supplier = await tx.supplier.create({ data: { ...normalize(input), tenantId } });
    await audit(tx, {
      tenantId, userId: actorId, action: "supplier.create", entity: "Supplier",
      entityId: supplier.id, metadata: { name: supplier.name },
    });
    return supplier;
  });
}

export function softDeleteSupplier(tenantId: string, actorId: string, id: string) {
  return withTenant(tenantId, async (tx) => {
    const res = await tx.supplier.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
    if (res.count === 0) throw new Error("NOT_FOUND");
    await audit(tx, { tenantId, userId: actorId, action: "supplier.delete", entity: "Supplier", entityId: id });
  });
}
