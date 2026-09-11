// Validacao PURA da importacao de produtos (sem DB). Reaproveita productSchema,
// entao as regras de tipo/valor sao as mesmas do cadastro individual.
import { parseCsv } from "@/lib/csv-parse";
import { productSchema, type ProductInput } from "@/lib/validators/product";

const HEADER_ALIASES: Record<string, string> = {
  sku: "sku", codigo: "sku",
  name: "name", nome: "name",
  barcode: "barcode", "codigo de barras": "barcode", ean: "barcode",
  brand: "brand", marca: "brand",
  category: "category", categoria: "category",
  unit: "unit", unidade: "unit",
  costprice: "costPrice", custo: "costPrice", "preco de custo": "costPrice",
  saleprice: "salePrice", venda: "salePrice", "preco de venda": "salePrice", preco: "salePrice",
  minstock: "minStock", "estoque minimo": "minStock",
  maxstock: "maxStock", "estoque maximo": "maxStock",
  currentstock: "currentStock", estoque: "currentStock", "estoque atual": "currentStock",
  status: "status",
};

const STATUS_MAP: Record<string, "ACTIVE" | "INACTIVE"> = {
  "": "ACTIVE", ativo: "ACTIVE", active: "ACTIVE", inativo: "INACTIVE", inactive: "INACTIVE",
};

export type RowError = { line: number; messages: string[] };
export type ValidRow = { line: number; sku: string; data: ProductInput };
export type ProductImportResult = {
  headerError?: string;
  totalRows: number;
  valid: ValidRow[];
  errors: RowError[];
  fileDuplicates: { line: number; sku: string }[];
};

function normNumber(v: string): string {
  const t = v.trim();
  if (t === "") return "0";
  if (/^\d{1,3}(\.\d{3})*,\d+$/.test(t)) return t.replace(/\./g, "").replace(",", ".");
  return t.replace(",", ".");
}

export function validateProductCsv(text: string): ProductImportResult {
  const matrix = parseCsv(text);
  if (matrix.length === 0) return { headerError: "Arquivo vazio.", totalRows: 0, valid: [], errors: [], fileDuplicates: [] };

  const rawHeaders = matrix[0].map((h) => h.trim().toLowerCase());
  const mapped = rawHeaders.map((h) => HEADER_ALIASES[h] ?? h);
  if (!mapped.includes("sku") || !mapped.includes("name")) {
    return { headerError: "Cabecalho invalido: sao obrigatorias as colunas 'sku' e 'name'.", totalRows: 0, valid: [], errors: [], fileDuplicates: [] };
  }

  const valid: ValidRow[] = [];
  const errors: RowError[] = [];
  const fileDuplicates: { line: number; sku: string }[] = [];
  const seen = new Set<string>();

  for (let r = 1; r < matrix.length; r++) {
    const line = r + 1;
    const cells = matrix[r];
    const obj: Record<string, string> = {};
    mapped.forEach((key, idx) => { obj[key] = (cells[idx] ?? "").trim(); });

    const candidate = {
      sku: obj.sku ?? "",
      name: obj.name ?? "",
      barcode: obj.barcode || undefined,
      brand: obj.brand || undefined,
      category: obj.category || undefined,
      unit: obj.unit || "un",
      costPrice: normNumber(obj.costPrice ?? ""),
      salePrice: normNumber(obj.salePrice ?? ""),
      minStock: normNumber(obj.minStock ?? ""),
      maxStock: normNumber(obj.maxStock ?? ""),
      currentStock: normNumber(obj.currentStock ?? ""),
      status: STATUS_MAP[(obj.status ?? "").toLowerCase()] ?? obj.status,
    };

    const parsed = productSchema.safeParse(candidate);
    if (!parsed.success) {
      errors.push({ line, messages: parsed.error.issues.map((i) => `${i.path.join(".") || "campo"}: ${i.message}`) });
      continue;
    }
    const sku = parsed.data.sku;
    if (seen.has(sku)) { fileDuplicates.push({ line, sku }); continue; }
    seen.add(sku);
    valid.push({ line, sku, data: parsed.data });
  }

  return { totalRows: matrix.length - 1, valid, errors, fileDuplicates };
}
