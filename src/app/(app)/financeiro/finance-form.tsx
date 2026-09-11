"use client";
import { useState, useTransition } from "react";
import { createFinanceEntryAction } from "./actions";

const inp = "rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-neutral-700";

export function FinanceForm() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("PAYABLE");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createFinanceEntryAction({ type, description, amount: Number(amount), dueDate });
      if (!res.ok) return setError(res.error);
      setDescription(""); setAmount(""); setDueDate(""); setOpen(false);
    });
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-dark">+ Novo lancamento</button>;
  }
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <select value={type} onChange={(e) => setType(e.target.value)} className={inp}>
          <option value="PAYABLE">A pagar</option>
          <option value="RECEIVABLE">A receber</option>
        </select>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descricao" className={`${inp} sm:col-span-2`} />
        <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor" className={inp} />
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inp} />
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={submit} disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-dark disabled:opacity-60">
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">Cancelar</button>
      </div>
    </div>
  );
}
