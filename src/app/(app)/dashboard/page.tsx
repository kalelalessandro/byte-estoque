import { requireTenant } from "@/lib/session";
import { getDashboardMetrics } from "@/server/dashboard";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${tone ?? ""}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-neutral-400">{hint}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const { tenantId } = await requireTenant();
  const m = await getDashboardMetrics(tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-500">Indicadores em tempo real da sua empresa.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Faturamento (mes)" value={brl(m.revenueMonth)} tone="text-brand" />
        <Stat label="A receber (aberto)" value={brl(m.receivableOpen)} tone="text-emerald-600" />
        <Stat label="A pagar (aberto)" value={brl(m.payableOpen)} tone="text-red-500" />
        <Stat label="Estoque baixo" value={String(m.lowStockCount)} hint="produtos no minimo ou abaixo" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Produtos" value={String(m.productCount)} />
        <Stat label="Clientes" value={String(m.customerCount)} />
        <Stat label="Fornecedores" value={String(m.supplierCount)} />
      </div>
    </div>
  );
}
