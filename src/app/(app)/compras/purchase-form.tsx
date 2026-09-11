"use client";
import { useMemo, useState, useTransition } from "react";
import { createPurchaseAction } from "./actions";

type Product = { id: string; name: string; costPrice: string };
type Supplier = { id: string; name: string };
type Branch = { id: string; name: string };
type Line = { productId: string; quantity: string; unitCost: string };

const inp = "rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-neutral-700";

export function PurchaseForm({ products, suppliers, branches }: { products: Product[]; suppliers: Supplier[]; branches: Branch[] }) {
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [freight, setFreight] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "1", unitCost: "0" }]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = useMemo(() => {
    const base = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0);
    return Math.max(0, base + (Number(freight) || 0) - (Number(discount) || 0));
  }, [lines, freight, discount]);

  function setLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function onPickProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    setLine(i, { productId, unitCost: p ? p.costPrice : "0" });
  }

  function submit() {
    setError(null);
    const items = lines.filter((l) => l.productId).map((l) => ({ productId: l.productId, quantity: Number(l.quantity), unitCost: Number(l.unitCost) }));
    if (items.length === 0) return setError("Adicione ao menos um item.");
    startTransition(async () => {
      const res = await createPurchaseAction({ supplierId, branchId: branchId || undefined, freight: Number(freight), discount: Number(discount), dueDate: dueDate || undefined, items });
      if (!res.ok) return setError(res.error);
      setLines([{ productId: "", quantity: "1", unitCost: "0" }]); setFreight("0"); setDiscount("0"); setDueDate(""); setSupplierId(""); setOpen(false);
    });
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-dark">+ Nova compra</button>;
  }
  if (products.length === 0) return <p className="text-sm text-neutral-500">Cadastre um produto antes de comprar.</p>;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={`${inp} sm:col-span-2`}>
          <option value="">Fornecedor (opcional)</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {branches.length > 1 && (
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inp} title="Filial de entrada">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inp} title="Vencimento (gera conta a pagar)" />
        <div className="flex items-center text-sm text-neutral-500">Venc. gera conta a pagar</div>
      </div>

      <div className="mt-4 space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_90px_110px_40px]">
            <select value={l.productId} onChange={(e) => onPickProduct(i, e.target.value)} className={inp} required>
              <option value="" disabled>Produto...</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" step="0.001" min="0" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} placeholder="Qtd" className={inp} />
            <input type="number" step="0.01" min="0" value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} placeholder="Custo" className={inp} />
            <button type="button" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="text-neutral-400 hover:text-red-500" title="Remover">×</button>
          </div>
        ))}
        <button type="button" onClick={() => setLines((ls) => [...ls, { productId: "", quantity: "1", unitCost: "0" }])} className="text-sm text-brand hover:underline">+ item</button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input type="number" step="0.01" min="0" value={freight} onChange={(e) => setFreight(e.target.value)} placeholder="Frete" className={inp} />
        <input type="number" step="0.01" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Desconto" className={inp} />
        <div className="col-span-2 flex items-center justify-end text-lg font-semibold tabular-nums">
          Total: {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={submit} disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-dark disabled:opacity-60">
          {pending ? "Registrando..." : "Registrar compra (da entrada no estoque)"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">Cancelar</button>
      </div>
    </div>
  );
}
