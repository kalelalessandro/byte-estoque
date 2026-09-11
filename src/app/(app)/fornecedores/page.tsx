import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { listSuppliers } from "@/server/suppliers";
import { SupplierForm } from "./supplier-form";
import { deleteSupplierAction } from "./actions";

export default async function FornecedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { role, tenantId } = await requirePermission("suppliers:read");
  const sp = await searchParams;
  const search = sp.q ?? "";
  const page = Number(sp.page ?? "1") || 1;
  const { items, total, pageSize } = await listSuppliers(tenantId, { search, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fornecedores</h1>
          <p className="text-sm text-neutral-500">{total} cadastrado(s).</p>
        </div>
        {can(role, "suppliers:write") && <SupplierForm />}
      </div>

      <form className="flex gap-2">
        <input name="q" defaultValue={search} placeholder="Buscar por nome, documento ou e-mail..."
          className="w-full max-w-md rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-neutral-700" />
        <button className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">Buscar</button>
      </form>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <p className="text-neutral-600 dark:text-neutral-300">
            {search ? "Nenhum fornecedor encontrado." : "Voce ainda nao possui fornecedores cadastrados."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {items.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-neutral-500">{s.document ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-500">{s.email ?? s.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {can(role, "suppliers:delete") && (
                        <form action={deleteSupplierAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <button className="text-xs text-neutral-400 hover:text-red-500">Excluir</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 text-sm">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link key={p} href={`/fornecedores?${new URLSearchParams({ q: search, page: String(p) })}`}
                  className={p === page ? "rounded bg-brand px-3 py-1 text-black" : "rounded border border-neutral-300 px-3 py-1 dark:border-neutral-700"}>
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
