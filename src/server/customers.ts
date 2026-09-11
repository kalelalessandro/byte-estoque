// Camada de dados do modulo Clientes.
// Recebe tenantId + actorId explicitos; roda tudo via withTenant() (RLS),
// e grava auditoria na MESMA transacao da mutacao.
import { withTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { assertWithinLimit } from "@/lib/entitlements";
import type { CustomerInput } from "@/lib/validators/customer";

function normalize(input: CustomerInput) {
  return {
    name: input.name,
    document: input.document || null,
    email: input.email || null,
    phone: input.phone || null,
    addressLine: input.addressLine || null,
    notes: input.notes || null,
  };
}

export function listCustomers(
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
      tx.customer.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      tx.customer.count({ where }),
    ]);
    return { items, total, page, pageSize };
  });
}

export function createCustomer(tenantId: string, actorId: string, input: CustomerInput) {
  return withTenant(tenantId, async (tx) => {
    await assertWithinLimit(tx, tenantId, "customers");
    const customer = await tx.customer.create({
      data: { ...normalize(input), tenantId },
    });
    await audit(tx, {
      tenantId,
      userId: actorId,
      action: "customer.create",
      entity: "Customer",
      entityId: customer.id,
      metadata: { name: customer.name },
    });
    return customer;
  });
}

export function updateCustomer(
  tenantId: string,
  actorId: string,
  id: string,
  input: CustomerInput,
) {
  return withTenant(tenantId, async (tx) => {
    const res = await tx.customer.updateMany({
      where: { id, deletedAt: null },
      data: normalize(input),
    });
    if (res.count === 0) throw new Error("NOT_FOUND");
    await audit(tx, {
      tenantId,
      userId: actorId,
      action: "customer.update",
      entity: "Customer",
      entityId: id,
    });
  });
}

export function softDeleteCustomer(tenantId: string, actorId: string, id: string) {
  return withTenant(tenantId, async (tx) => {
    const res = await tx.customer.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (res.count === 0) throw new Error("NOT_FOUND");
    await audit(tx, {
      tenantId,
      userId: actorId,
      action: "customer.delete",
      entity: "Customer",
      entityId: id,
    });
  });
}
