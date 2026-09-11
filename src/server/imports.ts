// Importacao de produtos: preview (sem gravar) e commit (transacional).
// - isolamento por tenant (withTenant/RLS);
// - proteje contra REIMPORTAR o mesmo arquivo (ImportBatch.contentHash unico);
// - pula SKUs ja existentes; respeita o limite do plano (bulk);
// - semeia estoque na filial padrao; audita.
import { createHash } from "crypto";
import { withTenant } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { getDefaultBranchIdTx } from "@/server/branches";
import { limitFor } from "@/lib/entitlements";
import { validateProductCsv } from "@/lib/imports/product-import";

export const MAX_IMPORT_ROWS = 5000;

export class AlreadyImportedError extends Error { constructor() { super("ALREADY_IMPORTED"); this.name = "AlreadyImportedError"; } }
export class TooManyRowsError extends Error { constructor() { super("TOO_MANY_ROWS"); this.name = "TooManyRowsError"; } }
export class ImportLimitError extends Error { constructor(public allowed: number) { super("IMPORT_LIMIT"); this.name = "ImportLimitError"; } }

const hashOf = (text: string) => createHash("sha256").update(text).digest("hex");

export type ImportPreview = {
  headerError?: string;
  totalRows: number;
  validCount: number;
  errorCount: number;
  fileDuplicateCount: number;
  existingCount: number;
  importableCount: number;
  alreadyImported: boolean;
  errors: { line: number; messages: string[] }[];
  sample: { line: number; sku: string; name: string; status: string }[];
};

export function previewProductImport(tenantId: string, text: string): Promise<ImportPreview> {
  const res = validateProductCsv(text);
  return withTenant(tenantId, async (tx): Promise<ImportPreview> => {
    if (res.headerError) {
      return { headerError: res.headerError, totalRows: 0, validCount: 0, errorCount: 0, fileDuplicateCount: 0, existingCount: 0, importableCount: 0, alreadyImported: false, errors: [], sample: [] };
    }
    const skus = res.valid.map((v) => v.sku);
    const existing = skus.length
      ? new Set((await tx.product.findMany({ where: { sku: { in: skus }, deletedAt: null }, select: { sku: true } })).map((p) => p.sku))
      : new Set<string>();
    const importable = res.valid.filter((v) => !existing.has(v.sku));
    const already = (await tx.importBatch.findFirst({ where: { contentHash: hashOf(text) }, select: { id: true } })) !== null;

    return {
      totalRows: res.totalRows,
      validCount: res.valid.length,
      errorCount: res.errors.length,
      fileDuplicateCount: res.fileDuplicates.length,
      existingCount: res.valid.length - importable.length,
      importableCount: importable.length,
      alreadyImported: already,
      errors: res.errors.slice(0, 50),
      sample: importable.slice(0, 20).map((v) => ({ line: v.line, sku: v.sku, name: v.data.name, status: v.data.status })),
    };
  });
}

export type ImportResult = { imported: number; skippedExisting: number; skippedInvalid: number };

export function commitProductImport(tenantId: string, actorId: string, text: string): Promise<ImportResult> {
  const res = validateProductCsv(text);
  if (res.headerError) throw new Error(res.headerError);
  if (res.totalRows > MAX_IMPORT_ROWS) throw new TooManyRowsError();
  const contentHash = hashOf(text);

  return withTenant(tenantId, async (tx): Promise<ImportResult> => {
    const dup = await tx.importBatch.findFirst({ where: { contentHash }, select: { id: true } });
    if (dup) throw new AlreadyImportedError();

    const skus = res.valid.map((v) => v.sku);
    const existing = skus.length
      ? new Set((await tx.product.findMany({ where: { sku: { in: skus }, deletedAt: null }, select: { sku: true } })).map((p) => p.sku))
      : new Set<string>();
    const toImport = res.valid.filter((v) => !existing.has(v.sku));

    // Limite do plano (bulk).
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
    const current = await tx.product.count({ where: { deletedAt: null } });
    const limit = limitFor(tenant?.plan ?? "STARTER", "products");
    if (limit >= 0 && current + toImport.length > limit) throw new ImportLimitError(Math.max(0, limit - current));

    const branchId = await getDefaultBranchIdTx(tx, tenantId);
    for (const row of toImport) {
      const d = row.data;
      const product = await tx.product.create({
        data: {
          tenantId, sku: d.sku, name: d.name, barcode: d.barcode || null, brand: d.brand || null,
          category: d.category || null, unit: d.unit, costPrice: d.costPrice, salePrice: d.salePrice,
          minStock: d.minStock, maxStock: d.maxStock, currentStock: d.currentStock, status: d.status,
        },
      });
      await tx.productStock.create({ data: { tenantId, productId: product.id, branchId, quantity: d.currentStock, minStock: d.minStock, maxStock: d.maxStock } });
    }

    await tx.importBatch.create({ data: { tenantId, entity: "product", contentHash, rowsImported: toImport.length, userId: actorId } });
    await audit(tx, { tenantId, userId: actorId, action: "import.products", entity: "ImportBatch", metadata: { imported: toImport.length } });

    return { imported: toImport.length, skippedExisting: existing.size, skippedInvalid: res.errors.length + res.fileDuplicates.length };
  });
}
