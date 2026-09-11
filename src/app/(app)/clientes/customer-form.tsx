"use client";

import { useState, useTransition } from "react";
import { createCustomerAction } from "./actions";

export function CustomerForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      const res = await createCustomerAction(formData);
      if (!res.ok) return setError(res.error);
      form.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-dark"
      >
        + Adicionar cliente
      </button>
    );
  }

  const input =
    "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-neutral-700";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="name" placeholder="Nome / Razao social" className={input} required />
        <input name="document" placeholder="CPF / CNPJ" className={input} />
        <input name="email" type="email" placeholder="E-mail" className={input} />
        <input name="phone" placeholder="Telefone" className={input} />
        <input name="addressLine" placeholder="Endereco" className={`${input} sm:col-span-2`} />
        <textarea name="notes" placeholder="Observacoes" className={`${input} sm:col-span-2`} rows={2} />
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar cliente"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
