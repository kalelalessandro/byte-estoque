// Parser CSV puro e tolerante (RFC 4180): aspas, virgulas e quebras dentro de
// campo, escape de aspas ("") e CRLF/LF. Remove BOM. Ignora linhas totalmente
// vazias. Pensado para arquivos de importacao — retorna matriz de strings.
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { pushField(); i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { pushField(); pushRow(); i++; continue; }
    field += c; i++;
  }
  // ultimo campo/linha (se houver conteudo pendente)
  if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }

  // descarta linhas totalmente vazias
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}
