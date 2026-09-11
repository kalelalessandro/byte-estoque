import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { listBranches } from "@/server/branches";
import { buildReport, type ReportType } from "@/server/reports";

const TABS: { key: ReportType; label: string }[] = [
  { key: "sales", label: "Vendas" },
  { key: "purchases", label: "Compras" },
  { key: "stock", label: "Estoque" },
  { key: "finance", label: "Financeiro" },
  { key: "top", label: "Mais vendidos" },
];

function fmtCell(v: string | number) {
  return typeof v === "number" ? v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : v;
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from?: string; to?: string; branch?: string }>;
}) {
  const { tenantId } = await requirePermission("reports:read");
  const sp = await searchParams;
  const type = (TABS.find((t) => t.key === sp.type)?.key ?? "sales") as ReportType;
  const from = sp.from ?? "";
  const to = sp.to ?? "";
  const branch = sp.branch ?? "";

  const [branches, report] = await Promise.all([
    listBranches(tenantId),
    buildReport(tenantId, type, { from: from || undefined, to: to || undefined, branchId: branch || undefined }),
  ]);
  const activeBranches = branches.filter((b) => b.active);

  const qs = new URLSearchParams({ type, ...(from ? { from } : {}), ...(to ? { to } : {}), ...(branch ? { branch } : {}) }).toString();
  const inp = "rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-neutral-700";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatorios</h1>
        <p className="text-sm text-neutral-500">Filtre por periodo e filial. Exporte em CSV.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={`/relatorios?type=${t.key}`} className={t.key === type ? "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black" : "rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"}>{t.label}</Link>
        ))}
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="type" value={type} />
        <label className="text-sm">De<br /><input type="date" name="from" defaultValue={from} className={inp} /></label>
        <label className="text-sm">Ate<br /><input type="date" name="to" defaultValue={to} className={inp} /></label>
        {type !== "finance" && activeBranches.length > 1 && (
          <label className="text-sm">Filial<br />
            <select name="branch" defaultValue={branch} className={inp}>
              <option value="">Todas</option>
              {activeBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        )}
        <button className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">Aplicar</button>
        <a href={`/api/reports/${type}?${qs}&format=csv`} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black hover:bg-brand-dark">CSV</a>
        <a href={`/api/reports/${type}?${qs}&format=xlsx`} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">Excel</a>
        <a href={`/api/reports/${type}?${qs}&format=pdf`} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">PDF</a>
      </form>

      {report.summary && (
        <div className="flex flex-wrap gap-4">
          {report.summary.map((s) => (
            <div key={s.label} className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-sm text-neutral-500">{s.label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {report.rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <p className="text-neutral-600 dark:text-neutral-300">Nenhum dado para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
              <tr>{report.headers.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {report.rows.map((row, i) => (
                <tr key={i}>{row.map((cell, j) => <td key={j} className="px-4 py-3 tabular-nums">{fmtCell(cell)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
