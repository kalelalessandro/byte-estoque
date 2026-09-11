import { requirePlatformAdmin } from "@/lib/platform-auth";
import { platformMetrics } from "@/server/platform";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function Card({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"><div className="text-sm text-neutral-500">{label}</div><div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div></div>;
}

export default async function PlatformOverview() {
  await requirePlatformAdmin();
  const m = await platformMetrics();
  const s = m.subscriptions;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Visao geral da plataforma</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card label="Empresas" value={m.tenants} />
        <Card label="Ativas" value={(s.ACTIVE ?? 0) + (s.TRIALING ?? 0)} />
        <Card label="Inadimplentes" value={(s.PAST_DUE ?? 0) + (s.SUSPENDED ?? 0)} />
        <Card label="Receita aprovada" value={brl(m.approvedTotal)} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Object.entries(s).map(([k, v]) => <Card key={k} label={`Assinaturas: ${k}`} value={v} />)}
      </div>
      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-500">Webhooks por status</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Object.keys(m.webhooks).length === 0 ? <p className="text-sm text-neutral-500">Nenhum evento ainda.</p> : Object.entries(m.webhooks).map(([k, v]) => <Card key={k} label={k} value={v} />)}
        </div>
      </div>
    </div>
  );
}
