import { requirePlatformAdmin } from "@/lib/platform-auth";
import { listPlatformPayments } from "@/server/platform";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function PlatformPayments() {
  await requirePlatformAdmin();
  const rows = await listPlatformPayments();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Pagamentos</h1>
      <p className="text-sm text-neutral-500">Referencias externas do gateway. Nenhum dado sensivel de cartao/token e armazenado ou exibido.</p>
      {rows.length === 0 ? <p className="text-sm text-neutral-500">Nenhum pagamento registrado.</p> : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900"><tr><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Empresa</th><th className="px-4 py-3 font-medium">Provedor</th><th className="px-4 py-3 font-medium">Ref. externa</th><th className="px-4 py-3 font-medium">Metodo</th><th className="px-4 py-3 font-medium">Valor</th><th className="px-4 py-3 font-medium">Status</th></tr></thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map((p) => (
                <tr key={p.id}><td className="px-4 py-3 text-neutral-500">{new Date(p.createdAt).toLocaleString("pt-BR")}</td><td className="px-4 py-3">{p.tenant ?? "—"}</td><td className="px-4 py-3 text-neutral-500">{p.provider}</td><td className="px-4 py-3 font-mono text-xs text-neutral-500">{p.providerRef ?? "—"}</td><td className="px-4 py-3">{p.method ?? "—"}</td><td className="px-4 py-3 tabular-nums">{brl(p.amount)}</td><td className="px-4 py-3">{p.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
