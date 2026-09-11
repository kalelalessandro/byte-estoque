// Filiais. Cada tenant tem ao menos uma filial padrao ("Matriz"), criada sob
// demanda. Estoque, vendas, compras e caixa acontecem sempre em uma filial.
import type { Prisma } from "@prisma/client";
import { withTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";

/** Garante e devolve a filial padrao do tenant (cria "Matriz" se nao existir). */
export async function getDefaultBranchIdTx(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
  const existing = await tx.branch.findFirst({ where: { isDefault: true }, select: { id: true } });
  if (existing) return existing.id;
  const anyBranch = await tx.branch.findFirst({ select: { id: true } });
  if (anyBranch) return anyBranch.id;
  const created = await tx.branch.create({ data: { tenantId, name: "Matriz", isDefault: true } });
  return created.id;
}

/** Resolve uma filial informada (validando que e do tenant) ou usa a padrao. */
export async function resolveBranchIdTx(tx: Prisma.TransactionClient, tenantId: string, branchId?: string): Promise<string> {
  if (branchId) {
    const b = await tx.branch.findFirst({ where: { id: branchId, active: true }, select: { id: true } });
    if (b) return b.id;
    throw new Error("BRANCH_NOT_FOUND");
  }
  return getDefaultBranchIdTx(tx, tenantId);
}

export function listBranches(tenantId: string) {
  return withTenant(tenantId, (tx) => tx.branch.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }));
}

export function ensureDefaultBranch(tenantId: string) {
  return withTenant(tenantId, (tx) => getDefaultBranchIdTx(tx, tenantId));
}

export function createBranch(tenantId: string, actorId: string, name: string) {
  return withTenant(tenantId, async (tx) => {
    const count = await tx.branch.count();
    const branch = await tx.branch.create({ data: { tenantId, name, isDefault: count === 0 } });
    await audit(tx, { tenantId, userId: actorId, action: "branch.create", entity: "Branch", entityId: branch.id, metadata: { name } });
    return branch;
  });
}

export function setBranchActive(tenantId: string, actorId: string, id: string, active: boolean) {
  return withTenant(tenantId, async (tx) => {
    const b = await tx.branch.findFirst({ where: { id } });
    if (!b) throw new Error("NOT_FOUND");
    if (b.isDefault && !active) throw new Error("CANNOT_DEACTIVATE_DEFAULT");
    await tx.branch.update({ where: { id }, data: { active } });
    await audit(tx, { tenantId, userId: actorId, action: "branch.setActive", entity: "Branch", entityId: id, metadata: { active } });
  });
}

export function setDefaultBranch(tenantId: string, actorId: string, id: string) {
  return withTenant(tenantId, async (tx) => {
    const b = await tx.branch.findFirst({ where: { id, active: true } });
    if (!b) throw new Error("NOT_FOUND");
    await tx.branch.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    await tx.branch.update({ where: { id }, data: { isDefault: true } });
    await audit(tx, { tenantId, userId: actorId, action: "branch.setDefault", entity: "Branch", entityId: id });
  });
}
