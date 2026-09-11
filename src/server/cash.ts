// Caixa por FILIAL. Um caixa aberto por filial por vez. Vendas em dinheiro
// entram como movimento SALE no caixa aberto da filial da venda.
import type { Prisma } from "@prisma/client";
import { withTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { expectedBalance, type CashMove } from "@/lib/cash-calc";
import { resolveBranchIdTx } from "@/server/branches";
import type { OpenRegisterInput, CashMovementInput, CloseRegisterInput } from "@/lib/validators/cash";

export class RegisterAlreadyOpenError extends Error { constructor() { super("REGISTER_ALREADY_OPEN"); this.name = "RegisterAlreadyOpenError"; } }
export class NoOpenRegisterError extends Error { constructor() { super("NO_OPEN_REGISTER"); this.name = "NoOpenRegisterError"; } }

function findOpenTx(tx: Prisma.TransactionClient, branchId: string) {
  return tx.cashRegister.findFirst({ where: { status: "OPEN", branchId }, include: { movements: { orderBy: { createdAt: "desc" } } } });
}

export function getOpenRegister(tenantId: string, branchId?: string) {
  return withTenant(tenantId, async (tx) => {
    const bId = await resolveBranchIdTx(tx, tenantId, branchId);
    const reg = await findOpenTx(tx, bId);
    if (!reg) return { branchId: bId, register: null as null, expected: 0 };
    const moves: CashMove[] = reg.movements.map((m) => ({ type: m.type, amount: Number(m.amount) }));
    return { branchId: bId, register: reg, expected: expectedBalance(Number(reg.openingBalance), moves) };
  });
}

export function openRegister(tenantId: string, actorId: string, branchId: string | undefined, input: OpenRegisterInput) {
  return withTenant(tenantId, async (tx) => {
    const bId = await resolveBranchIdTx(tx, tenantId, branchId);
    const open = await tx.cashRegister.findFirst({ where: { status: "OPEN", branchId: bId }, select: { id: true } });
    if (open) throw new RegisterAlreadyOpenError();
    const reg = await tx.cashRegister.create({ data: { tenantId, branchId: bId, status: "OPEN", openingBalance: input.openingBalance, openedById: actorId } });
    await audit(tx, { tenantId, userId: actorId, action: "cash.open", entity: "CashRegister", entityId: reg.id, metadata: { openingBalance: input.openingBalance, branchId: bId } });
    return reg;
  });
}

export function addMovement(tenantId: string, actorId: string, branchId: string | undefined, input: CashMovementInput) {
  return withTenant(tenantId, async (tx) => {
    const bId = await resolveBranchIdTx(tx, tenantId, branchId);
    const reg = await tx.cashRegister.findFirst({ where: { status: "OPEN", branchId: bId }, select: { id: true } });
    if (!reg) throw new NoOpenRegisterError();
    const mv = await tx.cashMovement.create({ data: { tenantId, registerId: reg.id, type: input.type, amount: input.amount, description: input.description || null, userId: actorId } });
    await audit(tx, { tenantId, userId: actorId, action: `cash.${input.type.toLowerCase()}`, entity: "CashMovement", entityId: mv.id, metadata: { amount: input.amount } });
    return mv;
  });
}

export function closeRegister(tenantId: string, actorId: string, branchId: string | undefined, input: CloseRegisterInput) {
  return withTenant(tenantId, async (tx) => {
    const bId = await resolveBranchIdTx(tx, tenantId, branchId);
    const reg = await findOpenTx(tx, bId);
    if (!reg) throw new NoOpenRegisterError();
    const moves: CashMove[] = reg.movements.map((m) => ({ type: m.type, amount: Number(m.amount) }));
    const expected = expectedBalance(Number(reg.openingBalance), moves);
    const difference = Math.round((input.countedBalance - expected) * 100) / 100;
    await tx.cashRegister.update({ where: { id: reg.id }, data: { status: "CLOSED", closingBalance: expected, countedBalance: input.countedBalance, difference, closedById: actorId, closedAt: new Date() } });
    await audit(tx, { tenantId, userId: actorId, action: "cash.close", entity: "CashRegister", entityId: reg.id, metadata: { expected, counted: input.countedBalance, difference } });
    return { expected, difference };
  });
}

/** Dentro da transacao da venda: registra venda em dinheiro no caixa aberto da filial (se houver). */
export async function recordCashSaleTx(tx: Prisma.TransactionClient, tenantId: string, actorId: string, saleId: string, amount: number, branchId: string) {
  const reg = await tx.cashRegister.findFirst({ where: { status: "OPEN", branchId }, select: { id: true } });
  if (!reg) return;
  await tx.cashMovement.create({ data: { tenantId, registerId: reg.id, type: "SALE", amount, description: `Venda ${saleId.slice(0, 8)}`, saleId, userId: actorId } });
}

export function listRegisters(tenantId: string, opts: { branchId?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 15));
  return withTenant(tenantId, async (tx) => {
    const where = { status: "CLOSED" as const, ...(opts.branchId ? { branchId: opts.branchId } : {}) };
    const [items, total] = await Promise.all([
      tx.cashRegister.findMany({ where, orderBy: { closedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { branch: { select: { name: true } } } }),
      tx.cashRegister.count({ where }),
    ]);
    return { items, total, page, pageSize };
  });
}
