// Relatorios — SOMENTE LEITURA, sob RLS (via withTenant), com filtro de periodo
// e filial. Cada funcao devolve { title, headers, rows, summary? } para render
// em tabela e exportacao CSV com o mesmo formato.
import type { Prisma } from "@prisma/client";
import { withTenant } from "@/lib/tenant";

export type ReportType = "sales" | "purchases" | "stock" | "finance" | "top";
export type Report = { title: string; headers: string[]; rows: (string | number)[][]; summary?: { label: string; value: string }[] };

export type ReportParams = { from?: string; to?: string; branchId?: string };

function period(p: ReportParams) {
  const gte = p.from ? new Date(p.from + "T00:00:00") : undefined;
  const to = p.to ? new Date(p.to + "T23:59:59") : undefined;
  const range = gte || to ? { ...(gte ? { gte } : {}), ...(to ? { lte: to } : {}) } : undefined;
  return range;
}
const brl = (v: unknown) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const d = (x: Date) => new Date(x).toLocaleDateString("pt-BR");

export function buildReport(tenantId: string, type: ReportType, p: ReportParams): Promise<Report> {
  const createdAt = period(p);
  const branch = p.branchId ? { branchId: p.branchId } : {};

  return withTenant(tenantId, async (tx): Promise<Report> => {
    switch (type) {
      case "sales": {
        const where: Prisma.SaleWhereInput = { status: "COMPLETED", ...(createdAt ? { createdAt } : {}), ...branch };
        const sales = await tx.sale.findMany({ where, orderBy: { createdAt: "desc" }, include: { customer: { select: { name: true } }, branch: { select: { name: true } } } });
        const total = sales.reduce((s, x) => s + Number(x.total), 0);
        return {
          title: "Vendas",
          headers: ["Data", "Filial", "Cliente", "Pagamento", "Total"],
          rows: sales.map((s) => [d(s.createdAt), s.branch.name, s.customer?.name ?? "-", s.paymentMethod, Number(s.total)]),
          summary: [{ label: "Vendas", value: String(sales.length) }, { label: "Faturamento", value: brl(total) }],
        };
      }
      case "purchases": {
        const where: Prisma.PurchaseWhereInput = { status: "COMPLETED", ...(createdAt ? { createdAt } : {}), ...branch };
        const purchases = await tx.purchase.findMany({ where, orderBy: { createdAt: "desc" }, include: { supplier: { select: { name: true } }, branch: { select: { name: true } } } });
        const total = purchases.reduce((s, x) => s + Number(x.total), 0);
        return {
          title: "Compras",
          headers: ["Data", "Filial", "Fornecedor", "Total"],
          rows: purchases.map((c) => [d(c.createdAt), c.branch.name, c.supplier?.name ?? "-", Number(c.total)]),
          summary: [{ label: "Compras", value: String(purchases.length) }, { label: "Total", value: brl(total) }],
        };
      }
      case "stock": {
        const stocks = await tx.productStock.findMany({
          where: { ...branch }, orderBy: { quantity: "asc" },
          include: { product: { select: { name: true, sku: true } }, branch: { select: { name: true } } },
        });
        const low = stocks.filter((s) => Number(s.quantity) <= Number(s.minStock)).length;
        return {
          title: "Estoque por filial",
          headers: ["Produto", "SKU", "Filial", "Saldo", "Minimo", "Baixo?"],
          rows: stocks.map((s) => [s.product.name, s.product.sku, s.branch.name, Number(s.quantity), Number(s.minStock), Number(s.quantity) <= Number(s.minStock) ? "sim" : "nao"]),
          summary: [{ label: "Itens", value: String(stocks.length) }, { label: "Em nivel baixo", value: String(low) }],
        };
      }
      case "finance": {
        const where: Prisma.FinanceEntryWhereInput = createdAt ? { dueDate: createdAt } : {};
        const entries = await tx.financeEntry.findMany({ where, orderBy: { dueDate: "asc" }, include: { customer: { select: { name: true } }, supplier: { select: { name: true } } } });
        const now = new Date();
        const openPay = entries.filter((e) => e.type === "PAYABLE" && e.status === "OPEN").reduce((s, e) => s + Number(e.amount), 0);
        const openRec = entries.filter((e) => e.type === "RECEIVABLE" && e.status === "OPEN").reduce((s, e) => s + Number(e.amount), 0);
        return {
          title: "Financeiro",
          headers: ["Vencimento", "Tipo", "Descricao", "Parte", "Valor", "Status", "Atrasado?"],
          rows: entries.map((e) => [d(e.dueDate), e.type === "PAYABLE" ? "A pagar" : "A receber", e.description, e.supplier?.name ?? e.customer?.name ?? "-", Number(e.amount), e.status, e.status === "OPEN" && new Date(e.dueDate) < now ? "sim" : "nao"]),
          summary: [{ label: "A pagar (aberto)", value: brl(openPay) }, { label: "A receber (aberto)", value: brl(openRec) }],
        };
      }
      case "top": {
        const grouped = await tx.saleItem.groupBy({
          by: ["productId"],
          where: { sale: { is: { status: "COMPLETED", ...(createdAt ? { createdAt } : {}), ...branch } } },
          _sum: { quantity: true, total: true },
          orderBy: { _sum: { quantity: "desc" } },
          take: 20,
        });
        const products = await tx.product.findMany({ where: { id: { in: grouped.map((g) => g.productId) } }, select: { id: true, name: true, sku: true } });
        const nameOf = new Map<string, { id: string; name: string; sku: string }>(products.map((p2) => [p2.id, p2]));
        return {
          title: "Produtos mais vendidos",
          headers: ["Produto", "SKU", "Qtd vendida", "Total"],
          rows: grouped.map((g) => {
            const prod = nameOf.get(g.productId);
            return [prod?.name ?? g.productId, prod?.sku ?? "-", Number(g._sum.quantity ?? 0), Number(g._sum.total ?? 0)];
          }),
        };
      }
    }
  });
}
