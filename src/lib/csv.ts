// Serializador CSV puro (testavel). Escapa aspas, virgulas e quebras de linha
// conforme RFC 4180 e usa CRLF. Prefixo BOM opcional para abrir bem no Excel.
export type CsvCell = string | number | null | undefined;

function escapeCell(v: CsvCell): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: CsvCell[][], opts: { bom?: boolean } = {}): string {
  const lines = [headers, ...rows].map((r) => r.map(escapeCell).join(","));
  const body = lines.join("\r\n");
  return (opts.bom ? "\uFEFF" : "") + body;
}
