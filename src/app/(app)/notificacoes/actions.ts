"use server";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/session";
import { markRead, markAllRead, setPreferences } from "@/server/notifications";

export async function markReadAction(formData: FormData): Promise<void> {
  const { tenantId, userId } = await requireTenant();
  const id = String(formData.get("id") ?? "");
  if (id) await markRead(tenantId, userId, id);
  revalidatePath("/notificacoes");
}
export async function markAllReadAction(): Promise<void> {
  const { tenantId, userId } = await requireTenant();
  await markAllRead(tenantId, userId);
  revalidatePath("/notificacoes");
}
export async function savePreferencesAction(raw: { emailBilling: boolean; emailLowStock: boolean }): Promise<{ ok: true }> {
  const { tenantId, userId } = await requireTenant();
  await setPreferences(tenantId, userId, { emailBilling: !!raw.emailBilling, emailLowStock: !!raw.emailLowStock });
  revalidatePath("/notificacoes");
  return { ok: true };
}
