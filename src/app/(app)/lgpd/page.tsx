import { requirePermission } from "@/lib/rbac";
import { listConsents, listLgpdRequests } from "@/server/lgpd";
import { RETENTION_POLICY } from "@/lib/lgpd/retention";
import { CloseAccount } from "./close-account";

export default async function LgpdPage() {
  const { tenantId } = await requirePermission("lgpd:manage");
  const [consents, requests] = await Promise.all([listConsents(tenantId), listLgpdRequests(tenantId)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Privacidade e dados (LGPD)</h1>
        <p className="text-sm text-neutral-500">Exporte os dados da empresa, gerencie consentimentos e encerre a conta.</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="font-semibold">Exportar dados</h2>
        <p className="mt-1 text-sm text-neutral-500">Baixe um JSON com os dados da sua empresa (apenas do seu tenant).</p>
        <a href="/api/lgpd/export" className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black hover:bg-brand-dark">Exportar JSON</a>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="font-semibold">O que e anonimizado, retido e excluido</h2>
        <ul className="mt-2 space-y-1 text-neutral-600 dark:text-neutral-300">
          <li><b>Anonimizado</b> no encerramento: {RETENTION_POLICY.personalData.note}.</li>
          <li><b>Retido</b> (nao apagado): {RETENTION_POLICY.financialRecords.note} — sugestao {RETENTION_POLICY.financialRecords.suggestedYears} anos.</li>
          <li><b>Retido</b> (seguranca): {RETENTION_POLICY.securityAuditLogs.note} — sugestao {RETENTION_POLICY.securityAuditLogs.suggestedMonths} meses.</li>
        </ul>
        <p className="mt-2 text-xs text-neutral-400">{RETENTION_POLICY.disclaimer}</p>
      </div>

      {consents.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="font-semibold">Consentimentos</h2>
          <ul className="mt-2 space-y-1 text-sm text-neutral-500">
            {consents.map((c) => <li key={c.id}>{new Date(c.createdAt).toLocaleDateString("pt-BR")} — {c.type} v{c.version}: {c.granted ? "concedido" : "revogado"}</li>)}
          </ul>
        </div>
      )}

      {requests.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="font-semibold">Historico de solicitacoes</h2>
          <ul className="mt-2 space-y-1 text-sm text-neutral-500">
            {requests.map((r) => <li key={r.id}>{new Date(r.createdAt).toLocaleString("pt-BR")} — {r.type} ({r.status})</li>)}
          </ul>
        </div>
      )}

      <CloseAccount />
    </div>
  );
}
