import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { buildReport, type ReportType } from "@/server/reports";
import { toCsv } from "@/lib/csv";
import { toXlsx, toPdf } from "@/lib/report-export";

const VALID: ReportType[] = ["sales", "purchases", "stock", "finance", "top"];

export async function GET(req: Request, ctx: { params: Promise<{ type: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return new Response("nao autenticado", { status: 401 });
  if (!can(session.user.role, "reports:read")) return new Response("sem permissao", { status: 403 });

  const { type } = await ctx.params;
  if (!VALID.includes(type as ReportType)) return new Response("relatorio invalido", { status: 400 });

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  const report = await buildReport(session.user.tenantId, type as ReportType, {
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    branchId: url.searchParams.get("branch") ?? undefined,
  });

  if (format === "xlsx") {
    const buf = toXlsx(report.title, report.headers, report.rows);
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="relatorio-${type}.xlsx"` } });
  }
  if (format === "pdf") {
    const buf = await toPdf(report.title, report.headers, report.rows);
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="relatorio-${type}.pdf"` } });
  }
  const csv = toCsv(report.headers, report.rows, { bom: true });
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="relatorio-${type}.csv"` } });
}
