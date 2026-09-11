"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { stockMovementSchema } from "@/lib/validators/stock";
import { recordMovement, InsufficientStockError } from "@/server/stock";
import { notifyLowStock } from "@/server/notifications";

type ActionResult = { ok: true; balance: string } | { ok: false; error: string };

export async function recordMovementAction(formData: FormData): Promise<ActionResult> {
  const { tenantId, userId } = await requirePermission("stock:write");
  const parsed = stockMovementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  }
  try {
    const res = await recordMovement(tenantId, userId, parsed.data);
    // Pos-commit, best-effort: notificacao de estoque baixo (fora da transacao).
    if (res.lowStock) await notifyLowStock(tenantId, { productName: res.productName, balance: Number(res.balance), min: res.min });
    revalidatePath("/estoque");
    return { ok: true, balance: String(res.balance) };
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      return { ok: false, error: "Estoque insuficiente para essa saida." };
    }
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return { ok: false, error: "Produto nao encontrado." };
    }
    return { ok: false, error: "Nao foi possivel registrar a movimentacao." };
  }
}
