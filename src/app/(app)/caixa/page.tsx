import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { getOpenRegister, listRegisters } from "@/server/cash";
import { listBranches } from "@/server/branches";
import { OpenForm, MovementForm, CloseForm } from "./cash-forms";

const brl = (v: unknown) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const MTYPE: Record<string, string> = { SALE: "Venda", SUPPLY: "Suprimento", WITHDRAWAL: "Sangria" };

export default async function CaixaPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const { role, tenantId } = await requirePermission("cash:read");
  const sp = await searchParams;
  const branches = await listBranches(tenantId);
  const active = branches.filter((b) => b.active);
  const selected = active.find((b) => b.id === sp.branch)?.id ?? active.find((b) => b.isDefault)?.id ?? active[0]?.id;

  const [open, history] = await Promise.all([getOpenRegister(tenantId, selected), listRegisters(tenantId, { branchId: selected })]);
  const canWrite = can(role, "cash:write");
  const branchId = open.branchId;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Caixa</h1>
          <p className="text-sm text-neutral-500">Abertura, sangrias/suprimentos e fechamento por filial.</p>
        </div>
        {active.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {active.map((b) => (
              <Link key={b.id} href={`/caixa?branch=${b.id}`} className={b.id === selected ? "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-black" : "rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"}>{b.name}</Link>
            ))}
          </div>
        )}
      </div>

      {!open.register ? (
        canWrite ? <OpenForm branchId={branchId} /> : <p className="text-sm text-neutral-500">Nenhum caixa aberto nesta filial.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"><div className="text-sm text-neutral-500">Abertura</div><div className="mt-1 text-xl font-semibold tabular-nums">{brl(open.register.openingBalance)}</div></div>
            <div className="rounded-2xl border border-brand/40 bg-white p-5 dark:bg-neutral-900"><div className="text-sm text-neutral-500">Saldo esperado</div><div className="mt-1 text-xl font-semibold tabular-nums text-brand">{brl(open.expected)}</div></div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"><div className="text-sm text-neutral-500">Movimentos</div><div className="mt-1 text-xl font-semibold tabular-nums">{open.register.movements.length}</div></div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"><div className="text-sm text-neutral-500">Aberto em</div><div className="mt-1 text-sm">{new Date(open.register.openedAt).toLocaleString("pt-BR")}</div></div>
          </div>
          {canWrite && <MovementForm branchId={branchId} />}
          {canWrite && <CloseForm expected={open.expected} branchId={branchId} />}
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900"><tr><th className="px-4 py-3 font-medium">Hora</th><th className="px-4 py-3 font-medium">Tipo</th><th className="px-4 py-3 font-medium">Valor</th><th className="px-4 py-3 font-medium">Descricao</th></tr></thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {open.register.movements.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-neutral-500">Sem movimentos ainda.</td></tr>
                ) : open.register.movements.map((m) => (
                  <tr key={m.id}><td className="px-4 py-3 text-neutral-500">{new Date(m.createdAt).toLocaleTimeString("pt-BR")}</td><td className="px-4 py-3"><span className={m.type === "WITHDRAWAL" ? "text-red-500" : "text-emerald-600"}>{MTYPE[m.type]}</span></td><td className="px-4 py-3 tabular-nums">{brl(m.amount)}</td><td className="px-4 py-3 text-neutral-500">{m.description ?? "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {history.items.length > 0 && (
        <div>
          <h2 className="mb-2 mt-4 text-sm font-medium text-neutral-500">Caixas fechados</h2>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900"><tr><th className="px-4 py-3 font-medium">Fechado em</th><th className="px-4 py-3 font-medium">Esperado</th><th className="px-4 py-3 font-medium">Contado</th><th className="px-4 py-3 font-medium">Diferenca</th></tr></thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {history.items.map((r) => (
                  <tr key={r.id}><td className="px-4 py-3 text-neutral-500">{r.closedAt ? new Date(r.closedAt).toLocaleString("pt-BR") : "—"}</td><td className="px-4 py-3 tabular-nums">{brl(r.closingBalance)}</td><td className="px-4 py-3 tabular-nums">{brl(r.countedBalance)}</td><td className={`px-4 py-3 tabular-nums ${Number(r.difference) === 0 ? "text-emerald-600" : "text-amber-600"}`}>{brl(r.difference)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
