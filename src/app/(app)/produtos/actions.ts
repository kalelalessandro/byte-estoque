"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { LimitExceededError } from "@/lib/entitlements";
import { productSchema } from "@/lib/validators/product";
import * as products from "@/server/products";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createProductAction(formData: FormData): Promise<ActionResult> {
  // Autorizacao no servidor + tenant/ator vindos da sessao (nunca do form).
  const { tenantId, userId } = await requirePermission("products:write");

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  }

  try {
    await products.createProduct(tenantId, userId, parsed.data);
  } catch (e) {
    if (e instanceof LimitExceededError) {
      return { ok: false, error: "Limite de produtos do seu plano atingido. Faca upgrade para adicionar mais." };
    }
    if (e instanceof Error && e.message.includes("Unique")) {
      return { ok: false, error: "Ja existe um produto com esse SKU." };
    }
    return { ok: false, error: "Nao foi possivel salvar o produto." };
  }

  revalidatePath("/produtos");
  return { ok: true };
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const { tenantId, userId } = await requirePermission("products:delete");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await products.softDeleteProduct(tenantId, userId, id);
  revalidatePath("/produtos");
}
