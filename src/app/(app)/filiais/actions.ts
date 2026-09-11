"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import * as branches from "@/server/branches";

type Result = { ok: true } | { ok: false; error: string };

export async function createBranchAction(raw: unknown): Promise<Result> {
  const { tenantId, userId } = await requirePermission("branches:write");
  const name = raw && typeof raw === "object" && "name" in raw ? String((raw as { name?: string }).name ?? "").trim() : "";
  if (name.length < 2) return { ok: false, error: "Informe o nome da filial." };
  try { await branches.createBranch(tenantId, userId, name); }
  catch { return { ok: false, error: "Nao foi possivel criar a filial." }; }
  revalidatePath("/filiais");
  return { ok: true };
}

export async function setActiveAction(formData: FormData): Promise<void> {
  const { tenantId, userId } = await requirePermission("branches:write");
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;
  try { await branches.setBranchActive(tenantId, userId, id, active); } catch { /* filial padrao nao pode ser desativada */ }
  revalidatePath("/filiais");
}

export async function setDefaultAction(formData: FormData): Promise<void> {
  const { tenantId, userId } = await requirePermission("branches:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await branches.setDefaultBranch(tenantId, userId, id);
  revalidatePath("/filiais");
}
