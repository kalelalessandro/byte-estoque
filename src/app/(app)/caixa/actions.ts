"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { openRegisterSchema, cashMovementSchema, closeRegisterSchema } from "@/lib/validators/cash";
import * as cash from "@/server/cash";

type Result = { ok: true } | { ok: false; error: string };
const branchOf = (raw: unknown) => (raw && typeof raw === "object" && "branchId" in raw ? String((raw as { branchId?: string }).branchId ?? "") || undefined : undefined);

export async function openRegisterAction(raw: unknown): Promise<Result> {
  const { tenantId, userId } = await requirePermission("cash:write");
  const parsed = openRegisterSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  try { await cash.openRegister(tenantId, userId, branchOf(raw), parsed.data); }
  catch (e) { if (e instanceof cash.RegisterAlreadyOpenError) return { ok: false, error: "Ja existe um caixa aberto nesta filial." }; return { ok: false, error: "Nao foi possivel abrir o caixa." }; }
  revalidatePath("/caixa"); return { ok: true };
}

export async function addMovementAction(raw: unknown): Promise<Result> {
  const { tenantId, userId } = await requirePermission("cash:write");
  const parsed = cashMovementSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  try { await cash.addMovement(tenantId, userId, branchOf(raw), parsed.data); }
  catch (e) { if (e instanceof cash.NoOpenRegisterError) return { ok: false, error: "Nenhum caixa aberto nesta filial." }; return { ok: false, error: "Nao foi possivel registrar o movimento." }; }
  revalidatePath("/caixa"); return { ok: true };
}

export async function closeRegisterAction(raw: unknown): Promise<Result> {
  const { tenantId, userId } = await requirePermission("cash:write");
  const parsed = closeRegisterSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  try { await cash.closeRegister(tenantId, userId, branchOf(raw), parsed.data); }
  catch (e) { if (e instanceof cash.NoOpenRegisterError) return { ok: false, error: "Nenhum caixa aberto nesta filial." }; return { ok: false, error: "Nao foi possivel fechar o caixa." }; }
  revalidatePath("/caixa"); return { ok: true };
}
