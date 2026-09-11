"use client";
import { useState, useTransition } from "react";
import { PLAN_CATALOG } from "@/lib/plans";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { changePlanAction, cancelAction, startCheckoutAction } from "./actions";
import type { PlanTier } from "@prisma/client";

const PLANS: PlanTier[] = ["STARTER", "PRO", "BUSINESS", "ENTERPRISE"];

export function PlanManager({ currentPlan, currentInterval, canManage, paymentsConfigured }: { currentPlan: PlanTier; currentInterval: string; canManage: boolean; paymentsConfigured: boolean }) {
  const [interval, setInterval] = useState(currentInterval === "ANNUAL" ? "ANNUAL" : "MONTHLY");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!canManage) return <p className="text-sm text-neutral-500">Apenas administradores podem alterar o plano.</p>;

  const change = (plan: PlanTier) => start(async () => {
    setErr(null); setMsg(null);
    const r = await changePlanAction({ plan, interval });
    if (!r.ok) return setErr(r.error);
    setMsg("Plano atualizado.");
  });
  const cancel = (atPeriodEnd: boolean) => start(async () => {
    setErr(null); setMsg(null);
    const r = await cancelAction({ atPeriodEnd });
    if (!r.ok) return setErr(r.error);
    setMsg(atPeriodEnd ? "Cancelamento agendado para o fim do periodo." : "Assinatura cancelada.");
  });

  const price = (p: PlanTier) => interval === "ANNUAL" ? PLAN_CATALOG[p].annual : PLAN_CATALOG[p].monthly;
  const per = interval === "ANNUAL" ? "/ano" : "/mes";
  const fmt = (n: number) => (n < 0 ? "Ilimitado" : n.toLocaleString("pt-BR"));

  const checkout = () => start(async () => {
    setErr(null); setMsg(null);
    const r = await startCheckoutAction({ plan: currentPlan, interval });
    if (!r.ok) return setErr(r.error);
    window.location.href = r.url;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-neutral-500">Ciclo:</span>
        {["MONTHLY", "ANNUAL"].map((iv) => (
          <button key={iv} onClick={() => setInterval(iv)} className={interval === iv ? "rounded-lg bg-brand px-3 py-1.5 font-medium text-black" : "rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700"}>
            {iv === "MONTHLY" ? "Mensal" : "Anual"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const isCurrent = p === currentPlan;
          const lim = PLAN_LIMITS[p];
          return (
            <div key={p} className={`rounded-2xl border p-5 ${isCurrent ? "border-brand bg-brand/[0.05]" : "border-neutral-200 dark:border-neutral-800"}`}>
              <div className="text-sm font-medium text-brand">{PLAN_CATALOG[p].label}</div>
              <div className="mt-1 text-xl font-bold tabular-nums">{p === "ENTERPRISE" ? "Sob consulta" : `R$ ${price(p)} ${per}`}</div>
              <ul className="mt-3 space-y-1 text-xs text-neutral-500">
                <li>{fmt(lim.products)} produtos</li>
                <li>{fmt(lim.users)} usuarios</li>
                <li>{fmt(lim.customers)} clientes</li>
              </ul>
              <button disabled={pending || isCurrent || p === "ENTERPRISE"} onClick={() => change(p)} className="mt-4 w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-black transition hover:bg-brand-dark disabled:opacity-50">
                {isCurrent ? "Plano atual" : p === "ENTERPRISE" ? "Falar com vendas" : "Selecionar"}
              </button>
            </div>
          );
        })}
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      {paymentsConfigured && (
        <button disabled={pending} onClick={checkout} className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-brand-dark disabled:opacity-60">
          Assinar / pagar o plano {currentPlan} ({interval === "ANNUAL" ? "anual" : "mensal"})
        </button>
      )}

      <div className="flex flex-wrap gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <button disabled={pending} onClick={() => cancel(true)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">Cancelar no fim do periodo</button>
        <button disabled={pending} onClick={() => cancel(false)} className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 dark:border-red-900/50">Cancelar agora</button>
      </div>
    </div>
  );
}
