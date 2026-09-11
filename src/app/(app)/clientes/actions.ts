"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { customerSchema } from "@/lib/validators/customer";
import * as customers from "@/server/customers";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createCustomerAction(formData: FormData): Promise<ActionResult> {
  // Autorizacao no servidor + tenant/ator vindos da sessao (nunca do form).
  const { tenantId, userId } = await requirePermission("customers:write");

  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  }

  try {
    await customers.createCustomer(tenantId, userId, parsed.data);
  } catch {
    return { ok: false, error: "Nao foi possivel salvar o cliente." };
  }
  revalidatePath("/clientes");
  return { ok: true };
}

export async function deleteCustomerAction(formData: FormData): Promise<void> {
  const { tenantId, userId } = await requirePermission("customers:delete");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await customers.softDeleteCustomer(tenantId, userId, id);
  revalidatePath("/clientes");
}
