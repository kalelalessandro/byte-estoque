import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSubscription, listEvents } from "@/server/subscriptions";
import { subscriptionAccess } from "@/lib/subscription-state";
import { PLAN_CATALOG } from "@/lib/plans";
import { Logo } from "@/components/logo";
import { PlanManager } from "./plan-manager";
import { isProviderConfigured } from "@/lib/payments";

const STATUS_LABEL: Record<string, string> = {
  TRIALING: "Em teste", ACTIVE: "Ativa", PAST_DUE: "Pagamento pendente", SUSPENDED: "Suspensa", CANCELED: "Cancelada", EXPIRED: "Expirada",
};

export default async function AssinaturaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.tenantId) redirect("/login");

  const [sub, events] = await Promise.all([getSubscription(session.user.tenantId), listEvents(session.user.tenantId)]);
  const access = subscriptionAccess(sub.status);
  const canManage = can(session.user.role, "billing:manage");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-3 dark:border-neutral-800">
        <Logo />
        {access.canUse && <Link href="/dashboard" className="text-sm text-brand hover:underline">← Voltar ao sistema</Link>}
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assinatura</h1>
          <p className="text-sm text-neutral-500">Gerencie o plano e o ciclo de cobranca do ByteForce.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"><div className="text-sm text-neutral-500">Plano</div><div className="mt-1 text-lg font-semibold">{PLAN_CATALOG[sub.plan].label}</div></div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"><div className="text-sm text-neutral-500">Status</div><div className="mt-1 text-lg font-semibold">{STATUS_LABEL[sub.status]}</div></div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"><div className="text-sm text-neutral-500">Ciclo</div><div className="mt-1 text-lg font-semibold">{sub.interval === "ANNUAL" ? "Anual" : "Mensal"}</div></div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"><div className="text-sm text-neutral-500">{sub.status === "TRIALING" ? "Teste ate" : "Periodo ate"}</div><div className="mt-1 text-lg font-semibold">{new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")}</div></div>
        </div>

        {sub.cancelAtPeriodEnd && <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">Cancelamento agendado para o fim do periodo atual.</p>}
        {!access.canUse && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">Sua assinatura esta {STATUS_LABEL[sub.status].toLowerCase()}. O acesso ao sistema esta bloqueado ate a regularizacao.</p>}

        <PlanManager currentPlan={sub.plan} currentInterval={sub.interval} canManage={canManage} paymentsConfigured={isProviderConfigured()} />

        {events.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-medium text-neutral-500">Historico</h2>
            <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900"><tr><th className="px-4 py-2 font-medium">Data</th><th className="px-4 py-2 font-medium">Evento</th><th className="px-4 py-2 font-medium">Detalhe</th></tr></thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {events.map((e) => (
                    <tr key={e.id}><td className="px-4 py-2 text-neutral-500">{new Date(e.createdAt).toLocaleString("pt-BR")}</td><td className="px-4 py-2">{e.type}</td><td className="px-4 py-2 text-neutral-500">{[e.fromPlan && e.toPlan ? `${e.fromPlan}→${e.toPlan}` : "", e.fromStatus && e.toStatus ? `${e.fromStatus}→${e.toStatus}` : ""].filter(Boolean).join(" · ") || "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
