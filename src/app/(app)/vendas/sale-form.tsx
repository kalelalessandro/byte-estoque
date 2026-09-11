"use client";
import { useMemo, useState, useTransition } from "react";
import { createSaleAction } from "./actions";

type Product = { id: string; name: string; salePrice: string; currentStock: string };
type Customer = { id: string; name: string };
type Branch = { id: string; name: string };
type Line = { productId: string; quantity: string; unitPrice: string };

const inp = "rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-neutral-700";

export function SaleForm({ products, customers, branches }: { products: Product[]; customers: Customer[]; branches: Branch[] }) {
  const [customerId, setCustomerId] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState("0");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "1", unitPrice: "0" }]);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = useMemo(() => {
    const base = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
    return Math.max(0, base - (Number(discount) || 0));
  }, [lines, discount]);

  function setLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function onPick(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    setLine(i, { productId, unitPrice: p ? p.salePrice : "0" });
  }
  function submit() {
    setError(null); setOkMsg(null);
    const items = lines.filter((l) => l.productId).map((l) => ({ productId: l.productId, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) }));
    if (items.length === 0) return setError("Adicione ao menos um item ao carrinho.");
    startTransition(async () => {
      const res = await createSaleAction({ customerId, branchId: branchId || undefined, paymentMethod, discount: Number(discount), items });
      if (!res.ok) return setError(res.error);
      setOkMsg("Venda finalizada e estoque atualizado."); setLines([{ productId: "", quantity: "1", unitPrice: "0" }]); setDiscount("0"); setCustomerId("");
    });
  }

  if (products.length === 0) return <p className="text-sm text-neutral-500">Cadastre um produto antes de vender.</p>;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="space-y-2">
        {lines.map((l, i) => {
          const p = products.find((x) => x.id === l.productId);
          return (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_90px_110px_40px]">
              <select value={l.productId} onChange={(e) => onPick(i, e.target.value)} className={inp} required>
                <option value="" disabled>Produto...</option>
                {products.map((pr) => <option key={pr.id} value={pr.id}>{pr.name} (saldo {pr.currentStock})</option>)}
              </select>
              <input type="number" step="0.001" min="0" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} placeholder="Qtd" className={inp} />
              <input type="number" step="0.01" min="0" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} placeholder="Preco" className={inp} title={p ? `Sugerido: ${p.salePrice}` : ""} />
              <button type="button" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="text-neutral-400 hover:text-red-500">×</button>
            </div>
          );
        })}
        <button type="button" onClick={() => setLines((ls) => [...ls, { productId: "", quantity: "1", unitPrice: "0" }])} className="text-sm text-brand hover:underline">+ item</button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        {branches.length > 1 && (
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inp} title="Filial da venda">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inp}>
          <option value="">Cliente (opcional)</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inp}>
          <option value="CASH">Dinheiro</option>
          <option value="PIX">Pix</option>
          <option value="CARD">Cartao</option>
          <option value="CREDIT">A prazo (gera a receber)</option>
        </select>
        <input type="number" step="0.01" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Desconto" className={inp} />
        <div className="flex items-center justify-end text-lg font-semibold tabular-nums">
          {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {okMsg && <p className="mt-3 text-sm text-emerald-600">{okMsg}</p>}
      <button onClick={submit} disabled={pending} className="mt-4 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-brand-dark disabled:opacity-60">
        {pending ? "Finalizando..." : "Finalizar venda"}
      </button>
    </div>
  );
}
