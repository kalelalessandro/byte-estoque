"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { LimitExceededError } from "@/lib/entitlements";
import { supplierSchema } from "@/lib/validators/supplier";
import * as suppliers from "@/server/suppliers";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createSupplierAction(formData: FormData): Promise<ActionResult> {
  const { tenantId, userId } = await requirePermission("suppliers:write");
  const parsed = supplierSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  }
  try {
    await suppliers.createSupplier(tenantId, userId, parsed.data);
  } catch (e) {
    if (e instanceof LimitExceededError) {
      return { ok: false, error: "Limite de fornecedores do seu plano atingido." };
    }
    return { ok: false, error: "Nao foi possivel salvar o fornecedor." };
  }
  revalidatePath("/fornecedores");
  return { ok: true };
}

export async function deleteSupplierAction(formData: FormData): Promise<void> {
  const { tenantId, userId } = await requirePermission("suppliers:delete");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await suppliers.softDeleteSupplier(tenantId, userId, id);
  revalidatePath("/fornecedores");
}
