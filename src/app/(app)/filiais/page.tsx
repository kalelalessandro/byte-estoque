import { requirePermission } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { listBranches } from "@/server/branches";
import { BranchForm } from "./branch-form";
import { setActiveAction, setDefaultAction } from "./actions";

export default async function FiliaisPage() {
  const { role, tenantId } = await requirePermission("branches:read");
  const branches = await listBranches(tenantId);
  const canWrite = can(role, "branches:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Filiais</h1>
          <p className="text-sm text-neutral-500">Cada filial tem seu proprio estoque, vendas, compras e caixa.</p>
        </div>
        {canWrite && <BranchForm />}
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
            <tr><th className="px-4 py-3 font-medium">Filial</th><th className="px-4 py-3 font-medium">Padrao</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {branches.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3">{b.isDefault ? <span className="rounded bg-brand/15 px-2 py-0.5 text-xs text-brand">Padrao</span> : "—"}</td>
                <td className="px-4 py-3">
                  <span className={b.active ? "rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700" : "rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600"}>{b.active ? "Ativa" : "Inativa"}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {canWrite && (
                    <div className="flex justify-end gap-3">
                      {!b.isDefault && b.active && (
                        <form action={setDefaultAction}><input type="hidden" name="id" value={b.id} /><button className="text-xs text-brand hover:underline">Tornar padrao</button></form>
                      )}
                      {!b.isDefault && (
                        <form action={setActiveAction}>
                          <input type="hidden" name="id" value={b.id} /><input type="hidden" name="active" value={String(!b.active)} />
                          <button className="text-xs text-neutral-400 hover:text-red-500">{b.active ? "Desativar" : "Ativar"}</button>
                        </form>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
