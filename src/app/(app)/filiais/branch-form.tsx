"use client";
import { useState, useTransition } from "react";
import { createBranchAction } from "./actions";

export function BranchForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da nova filial" className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-neutral-700" />
      <button disabled={pending} onClick={() => { setError(null); start(async () => { const r = await createBranchAction({ name }); if (!r.ok) return setError(r.error); setName(""); }); }} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-dark disabled:opacity-60">
        {pending ? "Criando..." : "+ Filial"}
      </button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}
