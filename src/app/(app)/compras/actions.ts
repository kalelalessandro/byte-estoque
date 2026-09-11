"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { purchaseSchema } from "@/lib/validators/purchase";
import * as purchases from "@/server/purchases";

type Result = { ok: true } | { ok: false; error: string };

export async function createPurchaseAction(raw: unknown): Promise<Result> {
  const { tenantId, userId } = await requirePermission("purchases:write");
  const parsed = purchaseSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  try {
    await purchases.createPurchase(tenantId, userId, parsed.data);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return { ok: false, error: "Produto invalido na compra." };
    return { ok: false, error: "Nao foi possivel registrar a compra." };
  }
  revalidatePath("/compras");
  revalidatePath("/estoque");
  return { ok: true };
}

export async function cancelPurchaseAction(formData: FormData): Promise<void> {
  const { tenantId, userId } = await requirePermission("purchases:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await purchases.cancelPurchase(tenantId, userId, id);
  revalidatePath("/compras");
  revalidatePath("/estoque");
}
