import { requirePlatformAdmin } from "@/lib/platform-auth";
import { listPlatformAudit } from "@/server/platform";

export default async function PlatformAudit() {
  await requirePlatformAdmin();
  const rows = await listPlatformAudit();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Auditoria da plataforma</h1>
      <p className="text-sm text-neutral-500">Acoes administrativas do super-admin (nao inclui auditoria operacional dos tenants).</p>
      {rows.length === 0 ? <p className="text-sm text-neutral-500">Nenhuma acao registrada.</p> : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900"><tr><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Acao</th><th className="px-4 py-3 font-medium">Empresa alvo</th></tr></thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map((a) => (
                <tr key={a.id}><td className="px-4 py-3 text-neutral-500">{new Date(a.createdAt).toLocaleString("pt-BR")}</td><td className="px-4 py-3">{a.action}</td><td className="px-4 py-3 font-mono text-xs text-neutral-500">{a.targetTenantId ?? "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
