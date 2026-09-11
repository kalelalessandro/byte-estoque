"use client";

import { useState, useTransition } from "react";
import { createProductAction } from "./actions";

export function ProductForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      const res = await createProductAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
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
        + Adicionar produto
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
        <input name="name" placeholder="Nome do produto" className={input} required />
        <input name="sku" placeholder="SKU" className={input} required />
        <input name="barcode" placeholder="Codigo de barras (opcional)" className={input} />
        <input name="category" placeholder="Categoria (opcional)" className={input} />
        <input name="brand" placeholder="Marca (opcional)" className={input} />
        <input name="maxStock" type="number" step="0.001" min="0" placeholder="Estoque maximo" className={input} />
        <input name="unit" placeholder="Unidade (un, kg...)" defaultValue="un" className={input} />
        <select name="status" defaultValue="ACTIVE" className={input}>
          <option value="ACTIVE">Ativo</option>
          <option value="INACTIVE">Inativo</option>
        </select>
        <input name="costPrice" type="number" step="0.01" min="0" placeholder="Preco de custo" className={input} />
        <input name="salePrice" type="number" step="0.01" min="0" placeholder="Preco de venda" className={input} />
        <input name="minStock" type="number" step="0.001" min="0" placeholder="Estoque minimo" className={input} />
        <input name="currentStock" type="number" step="0.001" min="0" placeholder="Estoque atual" className={input} />
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar produto"}
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
