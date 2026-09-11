import { requirePlatformAdmin } from "@/lib/platform-auth";
import { listPlatformWebhooks } from "@/server/platform";

export default async function PlatformWebhooks() {
  await requirePlatformAdmin();
  const rows = await listPlatformWebhooks();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Eventos de webhook</h1>
      <p className="text-sm text-neutral-500">Somente metadados dos eventos (o payload bruto do gateway nao e exibido).</p>
      {rows.length === 0 ? <p className="text-sm text-neutral-500">Nenhum evento recebido.</p> : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900"><tr><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Provedor</th><th className="px-4 py-3 font-medium">Ref.</th><th className="px-4 py-3 font-medium">Tipo</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Erro</th></tr></thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map((e) => (
                <tr key={e.id}><td className="px-4 py-3 text-neutral-500">{new Date(e.createdAt).toLocaleString("pt-BR")}</td><td className="px-4 py-3 text-neutral-500">{e.provider}</td><td className="px-4 py-3 font-mono text-xs text-neutral-500">{e.externalId}</td><td className="px-4 py-3">{e.type}</td><td className="px-4 py-3">{e.status}</td><td className="px-4 py-3 text-red-500">{e.error ?? "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
