import { requirePermission } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { listProducts } from "@/server/products";
import { listMovements } from "@/server/stock";
import { listBranches } from "@/server/branches";
import { MovementForm } from "./movement-form";

const TYPE_LABEL: Record<string, string> = { ENTRY: "Entrada", EXIT: "Saida", ADJUSTMENT: "Ajuste" };

export default async function EstoquePage() {
  const { role, tenantId } = await requirePermission("stock:read");
  const [products, movements, branches] = await Promise.all([
    listProducts(tenantId),
    listMovements(tenantId),
    listBranches(tenantId),
  ]);
  const branchOpts = branches.filter((b) => b.active).map((b) => ({ id: b.id, name: b.name }));
  const productOpts = products.map((p) => ({ id: p.id, name: p.name, currentStock: String(p.currentStock) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estoque</h1>
        <p className="text-sm text-neutral-500">Movimentacoes e saldo dos produtos.</p>
      </div>

      {can(role, "stock:write") && <MovementForm products={productOpts} branches={branchOpts} />}

      {movements.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <p className="text-neutral-600 dark:text-neutral-300">Nenhuma movimentacao de estoque ainda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Filial</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Qtd</th>
                <th className="px-4 py-3 font-medium">Saldo</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {movements.items.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 text-neutral-500">{new Date(m.createdAt).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 font-medium">{m.product.name}</td>
                  <td className="px-4 py-3 text-neutral-500">{m.branch.name}</td>
                  <td className="px-4 py-3">
                    <span className={
                      m.type === "ENTRY" ? "text-emerald-600" : m.type === "EXIT" ? "text-red-500" : "text-amber-600"
                    }>{TYPE_LABEL[m.type]}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{String(m.quantity)}</td>
                  <td className="px-4 py-3 tabular-nums">{String(m.balance)}</td>
                  <td className="px-4 py-3 text-neutral-500">{m.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
