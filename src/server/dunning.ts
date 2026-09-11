// Varredura de inadimplencia. Roda por cron: aplica a transicao de estado
// derivada do tempo (TRIALING/ACTIVE -> PAST_DUE -> SUSPENDED; cancelamento
// agendado -> EXPIRED) a cada tenant. Idempotente (converge) e protegida contra
// execucao concorrente por um lock com lease. Reativacao NAO acontece aqui — ela
// depende de pagamento confirmado (webhook -> activateFromPayment).
import { prisma } from "@/lib/prisma";
import { applyTimeState } from "@/server/subscriptions";
import { notifyBilling } from "@/server/notifications";

const LOCK_NAME = "subscription-sweep";
const LEASE_MS = 5 * 60 * 1000; // 5 min

async function acquireLock(): Promise<boolean> {
  const now = new Date();
  const until = new Date(now.getTime() + LEASE_MS);
  // Garante a linha (lease no passado) e tenta "ganhar" movendo para o futuro.
  await prisma.jobLock.upsert({ where: { name: LOCK_NAME }, create: { name: LOCK_NAME, lockedUntil: new Date(0) }, update: {} });
  const res = await prisma.jobLock.updateMany({ where: { name: LOCK_NAME, lockedUntil: { lt: now } }, data: { lockedUntil: until } });
  return res.count === 1;
}
async function releaseLock(): Promise<void> {
  await prisma.jobLock.updateMany({ where: { name: LOCK_NAME }, data: { lockedUntil: new Date(0) } });
}

export type SweepResult = { skipped?: true; scanned: number; transitioned: number; errors: number; transitions: Record<string, number> };

export async function sweepSubscriptions(): Promise<SweepResult> {
  if (!(await acquireLock())) {
    console.warn("[dunning] sweep ja em execucao — ignorando");
    return { skipped: true, scanned: 0, transitioned: 0, errors: 0, transitions: {} };
  }
  const summary: SweepResult = { scanned: 0, transitioned: 0, errors: 0, transitions: {} };
  try {
    // tenants NAO estao sob RLS; enumeramos os ids e refrescamos cada um sob seu contexto.
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const t of tenants) {
      summary.scanned++;
      try {
        const r = await applyTimeState(t.id);
        if (r.changed && r.to) {
          summary.transitioned++;
          summary.transitions[r.to] = (summary.transitions[r.to] ?? 0) + 1;
          console.log(`[dunning] tenant ${t.id}: ${r.from} -> ${r.to}`);
          if (r.to === "SUSPENDED") await notifyBilling(t.id, "subscription_suspended", "Assinatura suspensa", "Sua assinatura foi suspensa por falta de pagamento.", {}, ["suspended", t.id]);
        }
      } catch (e) {
        summary.errors++;
        console.error(`[dunning] falha no tenant ${t.id}:`, e instanceof Error ? e.message : e);
      }
    }
  } finally {
    await releaseLock();
  }
  console.log(`[dunning] sweep concluido: ${JSON.stringify(summary)}`);
  return summary;
}
