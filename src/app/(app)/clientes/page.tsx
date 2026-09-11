import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { listCustomers } from "@/server/customers";
import { CustomerForm } from "./customer-form";
import { deleteCustomerAction } from "./actions";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { role, tenantId } = await requirePermission("customers:read");
  const sp = await searchParams;
  const search = sp.q ?? "";
  const page = Number(sp.page ?? "1") || 1;

  const { items, total, pageSize } = await listCustomers(tenantId, { search, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canWrite = role !== "MEMBER" && role !== "FINANCE";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-neutral-500">{total} cadastrado(s).</p>
        </div>
        {canWrite && <CustomerForm />}
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder="Buscar por nome, documento ou e-mail..."
          className="w-full max-w-md rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-neutral-700"
        />
        <button className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
          Buscar
        </button>
      </form>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <p className="text-neutral-600 dark:text-neutral-300">
            {search ? "Nenhum cliente encontrado para essa busca." : "Voce ainda nao possui clientes cadastrados."}
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
                {items.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-neutral-500">{c.document ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-500">{c.email ?? c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {(role === "OWNER" || role === "ADMIN" || role === "MANAGER") && (
                        <form action={deleteCustomerAction}>
                          <input type="hidden" name="id" value={c.id} />
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
                <Link
                  key={p}
                  href={`/clientes?${new URLSearchParams({ q: search, page: String(p) })}`}
                  className={
                    p === page
                      ? "rounded bg-brand px-3 py-1 text-black"
                      : "rounded border border-neutral-300 px-3 py-1 dark:border-neutral-700"
                  }
                >
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
