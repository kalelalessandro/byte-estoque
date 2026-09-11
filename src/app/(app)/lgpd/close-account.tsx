"use client";
import { useState, useTransition } from "react";
import { closeAccountAction } from "./actions";

export function CloseAccount() {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="rounded-2xl border border-red-300 bg-red-50/40 p-5 dark:border-red-900/50 dark:bg-red-950/20">
      <h2 className="font-semibold text-red-700 dark:text-red-400">Encerrar conta</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
        Anonimiza imediatamente os dados pessoais (clientes, fornecedores e usuarios) e cancela a assinatura.
        Registros financeiros/fiscais e logs de auditoria sao <b>retidos</b> por obrigacao legal — nao sao apagados.
        Esta acao e irreversivel.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder='Digite ENCERRAR' className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-red-500 dark:border-neutral-700" />
        <button disabled={pending || confirm !== "ENCERRAR"} onClick={() => { setError(null); start(async () => { const r = await closeAccountAction({ confirm }); if (r && !r.ok) setError(r.error); }); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
          {pending ? "Encerrando..." : "Encerrar conta definitivamente"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
