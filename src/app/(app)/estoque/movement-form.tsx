"use client";

import { useState, useTransition } from "react";
import { recordMovementAction } from "./actions";

type ProductOpt = { id: string; name: string; currentStock: string };
type BranchOpt = { id: string; name: string };

export function MovementForm({ products, branches }: { products: ProductOpt[]; branches: BranchOpt[] }) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      const res = await recordMovementAction(formData);
      if (!res.ok) return setError(res.error);
      setOk(`Movimentacao registrada. Saldo atual: ${res.balance}`);
      form.reset();
    });
  }

  const input = "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-neutral-700";

  if (products.length === 0) {
    return <p className="text-sm text-neutral-500">Cadastre um produto antes de movimentar o estoque.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {branches.length > 1 ? (
          <select name="branchId" className={input} defaultValue={branches[0]?.id}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        ) : (
          <input type="hidden" name="branchId" value={branches[0]?.id ?? ""} />
        )}
        <select name="productId" className={`${input} sm:col-span-2`} required defaultValue="">
          <option value="" disabled>Selecione o produto...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} (saldo: {p.currentStock})</option>
          ))}
        </select>
        <select name="type" className={input} defaultValue="ENTRY">
          <option value="ENTRY">Entrada</option>
          <option value="EXIT">Saida</option>
          <option value="ADJUSTMENT">Ajuste (define saldo)</option>
        </select>
        <input name="quantity" type="number" step="0.001" min="0" placeholder="Quantidade" className={input} required />
        <input name="reason" placeholder="Motivo (opcional)" className={`${input} sm:col-span-4`} />
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {ok && <p className="mt-3 text-sm text-emerald-600">{ok}</p>}
      <button type="submit" disabled={pending} className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-dark disabled:opacity-60">
        {pending ? "Registrando..." : "Registrar movimentacao"}
      </button>
    </form>
  );
}
