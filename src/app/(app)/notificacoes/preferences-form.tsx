"use client";
import { useState, useTransition } from "react";
import { savePreferencesAction } from "./actions";

export function PreferencesForm({ emailBilling, emailLowStock }: { emailBilling: boolean; emailLowStock: boolean }) {
  const [billing, setBilling] = useState(emailBilling);
  const [lowStock, setLowStock] = useState(emailLowStock);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="font-semibold">Preferencias de e-mail</h2>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={billing} onChange={(e) => setBilling(e.target.checked)} /> Avisos de cobranca/assinatura</label>
      <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} /> Avisos de estoque baixo</label>
      <button disabled={pending} onClick={() => start(async () => { await savePreferencesAction({ emailBilling: billing, emailLowStock: lowStock }); setMsg("Preferencias salvas."); })} className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black hover:bg-brand-dark disabled:opacity-60">Salvar</button>
      {msg && <span className="ml-3 text-sm text-emerald-600">{msg}</span>}
    </div>
  );
}
