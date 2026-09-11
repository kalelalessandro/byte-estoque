import { requirePermission } from "@/lib/rbac";
import { exportTenantData, requestExport } from "@/server/lgpd";

export async function GET() {
  let ctx;
  try { ctx = await requirePermission("lgpd:manage"); }
  catch { return new Response("sem permissao", { status: 403 }); }
  const data = await exportTenantData(ctx.tenantId);
  await requestExport(ctx.tenantId, ctx.userId).catch(() => {});
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="byteforce-export.json"` },
  });
}
