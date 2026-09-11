import { requireTenant } from "@/lib/session";
import { listProducts } from "@/server/products";
import { ProductForm } from "./product-form";
import { deleteProductAction } from "./actions";

const brl = (v: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

export default async function ProdutosPage() {
  const { tenantId } = await requireTenant();
  const products = await listProducts(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
          <p className="text-sm text-neutral-500">Cadastro do seu catalogo.</p>
        </div>
        <ProductForm />
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <p className="text-neutral-600 dark:text-neutral-300">
            Voce ainda nao possui produtos cadastrados.
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Use o botao &quot;Adicionar produto&quot; acima para comecar.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Venda</th>
                <th className="px-4 py-3 font-medium">Estoque</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-neutral-500">{p.sku}</td>
                  <td className="px-4 py-3">{brl(p.salePrice)}</td>
                  <td className="px-4 py-3">
                    {Number(p.currentStock)}{" "}
                    {Number(p.currentStock) <= Number(p.minStock) && (
                      <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                        baixo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.status === "ACTIVE"
                          ? "rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                          : "rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600"
                      }
                    >
                      {p.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteProductAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-xs text-neutral-400 hover:text-red-500">Excluir</button>
                    </form>
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
