import { requirePlatformAdmin } from "@/lib/platform-auth";
import { listPlatformTenants } from "@/server/platform";
import { suspendTenantAction, reactivateTenantAction } from "../actions";

export default async function PlatformTenants({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const { items, total } = await listPlatformTenants({ search: sp.q });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Empresas ({total})</h1>
      <form className="flex gap-2"><input name="q" defaultValue={sp.q ?? ""} placeholder="Buscar empresa..." className="w-full max-w-sm rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-neutral-700" /><button className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">Buscar</button></form>
      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900"><tr><th className="px-4 py-3 font-medium">Empresa</th><th className="px-4 py-3 font-medium">Plano</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Criada</th><th className="px-4 py-3"></th></tr></thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {items.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3"><div className="font-medium">{t.name}</div><div className="text-xs text-neutral-400">{t.slug}</div></td>
                <td className="px-4 py-3 text-neutral-500">{t.plan ?? "—"}</td>
                <td className="px-4 py-3">{t.status ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-500">{new Date(t.createdAt).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-right">
                  {t.status === "SUSPENDED" ? (
                    <form action={reactivateTenantAction}><input type="hidden" name="tenantId" value={t.id} /><button className="text-xs text-emerald-600 hover:underline">Reativar</button></form>
                  ) : (
                    <form action={suspendTenantAction}><input type="hidden" name="tenantId" value={t.id} /><button className="text-xs text-red-500 hover:underline">Suspender</button></form>
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
