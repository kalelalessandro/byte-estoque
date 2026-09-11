"use server";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { closeAccount } from "@/server/lgpd";
import { signOut } from "@/lib/auth";

export async function closeAccountAction(raw: { confirm: string }): Promise<{ ok: false; error: string } | void> {
  const { tenantId, userId } = await requirePermission("lgpd:manage");
  if (raw.confirm !== "ENCERRAR") return { ok: false, error: 'Digite ENCERRAR para confirmar.' };
  await closeAccount(tenantId, userId);
  // A conta foi encerrada e os usuarios anonimizados -> encerra a sessao.
  await signOut({ redirectTo: "/login" });
  redirect("/login");
}
