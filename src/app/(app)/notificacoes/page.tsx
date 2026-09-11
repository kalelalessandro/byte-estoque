import { requireTenant } from "@/lib/session";
import { listNotifications, getPreferences } from "@/server/notifications";
import { markReadAction, markAllReadAction } from "./actions";
import { PreferencesForm } from "./preferences-form";

export default async function NotificacoesPage() {
  const { tenantId, userId } = await requireTenant();
  const [items, prefs] = await Promise.all([listNotifications(tenantId, userId), getPreferences(tenantId, userId)]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight">Notificacoes</h1><p className="text-sm text-neutral-500">Avisos da sua empresa.</p></div>
        <form action={markAllReadAction}><button className="text-sm text-brand hover:underline">Marcar todas como lidas</button></form>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700"><p className="text-neutral-600 dark:text-neutral-300">Nenhuma notificacao.</p></div>
      ) : (
        <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {items.map((n) => (
            <div key={n.id} className={`flex items-start justify-between gap-4 p-4 ${n.readAt ? "" : "bg-brand/[0.04]"}`}>
              <div>
                <div className="flex items-center gap-2"><span className="font-medium">{n.title}</span>{!n.readAt && <span className="rounded bg-brand/15 px-1.5 py-0.5 text-xs text-brand">nova</span>}</div>
                <p className="text-sm text-neutral-500">{n.body}</p>
                <p className="mt-1 text-xs text-neutral-400">{new Date(n.createdAt).toLocaleString("pt-BR")}</p>
              </div>
              {!n.readAt && <form action={markReadAction}><input type="hidden" name="id" value={n.id} /><button className="text-xs text-neutral-400 hover:text-brand">marcar lida</button></form>}
            </div>
          ))}
        </div>
      )}

      <PreferencesForm emailBilling={prefs.emailBilling} emailLowStock={prefs.emailLowStock} />
    </div>
  );
}
