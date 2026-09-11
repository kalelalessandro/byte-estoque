"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { financeEntrySchema } from "@/lib/validators/finance";
import * as finance from "@/server/finance";

type Result = { ok: true } | { ok: false; error: string };

export async function createFinanceEntryAction(raw: unknown): Promise<Result> {
  const { tenantId, userId } = await requirePermission("finance:write");
  const parsed = financeEntrySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  try {
    await finance.createFinanceEntry(tenantId, userId, parsed.data);
  } catch {
    return { ok: false, error: "Nao foi possivel salvar o lancamento." };
  }
  revalidatePath("/financeiro");
  return { ok: true };
}

export async function markPaidAction(formData: FormData): Promise<void> {
  const { tenantId, userId } = await requirePermission("finance:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await finance.markPaid(tenantId, userId, id);
  revalidatePath("/financeiro");
}
