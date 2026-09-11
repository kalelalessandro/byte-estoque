"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { saleSchema } from "@/lib/validators/sale";
import * as sales from "@/server/sales";

type Result = { ok: true } | { ok: false; error: string };

export async function createSaleAction(raw: unknown): Promise<Result> {
  const { tenantId, userId } = await requirePermission("sales:write");
  const parsed = saleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  try {
    await sales.createSale(tenantId, userId, parsed.data);
  } catch (e) {
    if (e instanceof sales.InsufficientStockError) return { ok: false, error: "Estoque insuficiente para um dos itens." };
    if (e instanceof Error && e.message === "NOT_FOUND") return { ok: false, error: "Produto invalido na venda." };
    return { ok: false, error: "Nao foi possivel finalizar a venda." };
  }
  revalidatePath("/vendas");
  revalidatePath("/estoque");
  return { ok: true };
}

export async function cancelSaleAction(formData: FormData): Promise<void> {
  const { tenantId, userId } = await requirePermission("sales:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await sales.cancelSale(tenantId, userId, id);
  revalidatePath("/vendas");
  revalidatePath("/estoque");
}
