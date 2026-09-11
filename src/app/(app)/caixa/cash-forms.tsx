"use client";
import { useState, useTransition } from "react";
import { openRegisterAction, addMovementAction, closeRegisterAction } from "./actions";

const inp = "rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-neutral-700";
const btn = "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-dark disabled:opacity-60";

export function OpenForm({ branchId }: { branchId: string }) {
  const [openingBalance, setV] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="font-semibold">Abrir caixa</h2>
      <p className="mt-1 text-sm text-neutral-500">Informe o saldo inicial (fundo de troco).</p>
      <div className="mt-4 flex gap-2">
        <input type="number" step="0.01" min="0" value={openingBalance} onChange={(e) => setV(e.target.value)} className={inp} />
        <button className={btn} disabled={pending} onClick={() => { setError(null); start(async () => { const r = await openRegisterAction({ branchId, openingBalance: Number(openingBalance) }); if (!r.ok) setError(r.error); }); }}>
          {pending ? "Abrindo..." : "Abrir caixa"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}

export function MovementForm({ branchId }: { branchId: string }) {
  const [type, setType] = useState("SUPPLY");
  const [amount, setAmount] = useState("");
  const [description, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <select value={type} onChange={(e) => setType(e.target.value)} className={inp}>
          <option value="SUPPLY">Suprimento (+)</option>
          <option value="WITHDRAWAL">Sangria (-)</option>
        </select>
        <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor" className={inp} />
        <input value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Descricao (opcional)" className={`${inp} sm:col-span-1`} />
        <button className={btn} disabled={pending} onClick={() => { setError(null); start(async () => { const r = await addMovementAction({ branchId, type, amount: Number(amount), description }); if (!r.ok) return setError(r.error); setAmount(""); setDesc(""); }); }}>
          {pending ? "..." : "Registrar"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}

export function CloseForm({ expected, branchId }: { expected: number; branchId: string }) {
  const [counted, setCounted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const diff = counted === "" ? null : Math.round((Number(counted) - expected) * 100) / 100;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="font-semibold">Fechar caixa</h3>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input type="number" step="0.01" min="0" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="Valor contado na gaveta" className={inp} />
        {diff !== null && (
          <span className={`text-sm ${diff === 0 ? "text-emerald-600" : "text-amber-600"}`}>
            Diferenca: {diff.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        )}
        <button className={btn} disabled={pending || counted === ""} onClick={() => { setError(null); start(async () => { const r = await closeRegisterAction({ branchId, countedBalance: Number(counted) }); if (!r.ok) setError(r.error); }); }}>
          {pending ? "Fechando..." : "Fechar caixa"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
