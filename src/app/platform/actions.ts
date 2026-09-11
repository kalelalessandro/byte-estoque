"use server";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { suspendTenant, reactivateTenant } from "@/server/platform";

export async function suspendTenantAction(formData: FormData): Promise<void> {
  const { userId } = await requirePlatformAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  if (!tenantId) return;
  await suspendTenant(userId, tenantId);
  revalidatePath("/platform/tenants");
}
export async function reactivateTenantAction(formData: FormData): Promise<void> {
  const { userId } = await requirePlatformAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  if (!tenantId) return;
  await reactivateTenant(userId, tenantId);
  revalidatePath("/platform/tenants");
}
