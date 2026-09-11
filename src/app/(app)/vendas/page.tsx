import { requirePermission } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { listProducts } from "@/server/products";
import { listCustomers } from "@/server/customers";
import { listSales } from "@/server/sales";
import { listBranches } from "@/server/branches";
import { SaleForm } from "./sale-form";
import { cancelSaleAction } from "./actions";

const brl = (v: unknown) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const METHOD: Record<string, string> = { CASH: "Dinheiro", PIX: "Pix", CARD: "Cartao", CREDIT: "A prazo" };

export default async function VendasPage() {
  const { role, tenantId } = await requirePermission("sales:read");
  const [products, customers, sales, branches] = await Promise.all([
    listProducts(tenantId),
    listCustomers(tenantId, { pageSize: 100 }),
    listSales(tenantId),
    listBranches(tenantId),
  ]);
  const branchOpts = branches.filter((b) => b.active).map((b) => ({ id: b.id, name: b.name }));
  const productOpts = products.filter((p) => p.status === "ACTIVE").map((p) => ({ id: p.id, name: p.name, salePrice: String(p.salePrice), currentStock: String(p.currentStock) }));
  const customerOpts = customers.items.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vendas / PDV</h1>
        <p className="text-sm text-neutral-500">Finalizar uma venda baixa o estoque; a prazo gera conta a receber.</p>
      </div>

      {can(role, "sales:write") && <SaleForm products={productOpts} customers={customerOpts} branches={branchOpts} />}

      {sales.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <p className="text-neutral-600 dark:text-neutral-300">Nenhuma venda registrada ainda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Itens</th>
                <th className="px-4 py-3 font-medium">Pagamento</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {sales.items.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-neutral-500">{new Date(s.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">{s.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-500">{s._count.items}</td>
                  <td className="px-4 py-3 text-neutral-500">{METHOD[s.paymentMethod]}</td>
                  <td className="px-4 py-3 tabular-nums">{brl(s.total)}</td>
                  <td className="px-4 py-3">
                    <span className={s.status === "COMPLETED" ? "rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700" : "rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600"}>
                      {s.status === "COMPLETED" ? "Concluida" : "Cancelada"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === "COMPLETED" && can(role, "sales:write") && (
                      <form action={cancelSaleAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="text-xs text-neutral-400 hover:text-red-500">Cancelar</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
