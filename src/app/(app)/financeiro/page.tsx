import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { listFinance, financeSummary } from "@/server/finance";
import { FinanceForm } from "./finance-form";
import { markPaidAction } from "./actions";
import type { FinanceType } from "@prisma/client";

const brl = (v: unknown) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const STATUS: Record<string, string> = { OPEN: "Em aberto", PAID: "Pago", CANCELED: "Cancelado" };

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { role, tenantId } = await requirePermission("finance:read");
  const sp = await searchParams;
  const type = (sp.type === "RECEIVABLE" ? "RECEIVABLE" : "PAYABLE") as FinanceType;
  const [{ items }, summary] = await Promise.all([listFinance(tenantId, { type }), financeSummary(tenantId)]);
  const canWrite = can(role, "finance:write");

  const Tab = ({ value, label }: { value: string; label: string }) => (
    <Link href={`/financeiro?type=${value}`} className={type === value ? "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black" : "rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"}>{label}</Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-sm text-neutral-500">Contas a pagar e a receber.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-sm text-neutral-500">A pagar (em aberto)</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-red-500">{brl(summary.payableOpen)}</div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-sm text-neutral-500">A receber (em aberto)</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-emerald-600">{brl(summary.receivableOpen)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2"><Tab value="PAYABLE" label="A pagar" /><Tab value="RECEIVABLE" label="A receber" /></div>
        {canWrite && <FinanceForm />}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <p className="text-neutral-600 dark:text-neutral-300">Nenhum lancamento nesta aba.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Descricao</th>
                <th className="px-4 py-3 font-medium">{type === "PAYABLE" ? "Fornecedor" : "Cliente"}</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {items.map((e) => {
                const overdue = e.status === "OPEN" && new Date(e.dueDate) < new Date();
                return (
                  <tr key={e.id}>
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(e.dueDate).toLocaleDateString("pt-BR")}
                      {overdue && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600">atrasado</span>}
                    </td>
                    <td className="px-4 py-3 font-medium">{e.description}</td>
                    <td className="px-4 py-3 text-neutral-500">{e.supplier?.name ?? e.customer?.name ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{brl(e.amount)}</td>
                    <td className="px-4 py-3">{STATUS[e.status]}</td>
                    <td className="px-4 py-3 text-right">
                      {e.status === "OPEN" && canWrite && (
                        <form action={markPaidAction}>
                          <input type="hidden" name="id" value={e.id} />
                          <button className="text-xs text-brand hover:underline">{type === "PAYABLE" ? "Pagar" : "Receber"}</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
