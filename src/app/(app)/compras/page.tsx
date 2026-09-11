import { requirePermission } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { listProducts } from "@/server/products";
import { listSuppliers } from "@/server/suppliers";
import { listPurchases } from "@/server/purchases";
import { listBranches } from "@/server/branches";
import { PurchaseForm } from "./purchase-form";
import { cancelPurchaseAction } from "./actions";

const brl = (v: unknown) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function ComprasPage() {
  const { role, tenantId } = await requirePermission("purchases:read");
  const [products, suppliers, purchases, branches] = await Promise.all([
    listProducts(tenantId),
    listSuppliers(tenantId, { pageSize: 100 }),
    listPurchases(tenantId),
    listBranches(tenantId),
  ]);
  const branchOpts = branches.filter((b) => b.active).map((b) => ({ id: b.id, name: b.name }));
  const productOpts = products.map((p) => ({ id: p.id, name: p.name, costPrice: String(p.costPrice) }));
  const supplierOpts = suppliers.items.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compras</h1>
          <p className="text-sm text-neutral-500">Entradas de mercadoria. Concluir uma compra da entrada no estoque.</p>
        </div>
      </div>

      {can(role, "purchases:write") && <PurchaseForm products={productOpts} suppliers={supplierOpts} branches={branchOpts} />}

      {purchases.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <p className="text-neutral-600 dark:text-neutral-300">Nenhuma compra registrada ainda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="px-4 py-3 font-medium">Itens</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {purchases.items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-neutral-500">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">{p.supplier?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-500">{p._count.items}</td>
                  <td className="px-4 py-3 tabular-nums">{brl(p.total)}</td>
                  <td className="px-4 py-3">
                    <span className={p.status === "COMPLETED" ? "rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700" : "rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600"}>
                      {p.status === "COMPLETED" ? "Concluida" : "Cancelada"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status === "COMPLETED" && can(role, "purchases:write") && (
                      <form action={cancelPurchaseAction}>
                        <input type="hidden" name="id" value={p.id} />
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
