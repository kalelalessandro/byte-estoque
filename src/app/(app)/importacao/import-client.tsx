"use client";
import { useState, useTransition } from "react";
import { previewImportAction, commitImportAction } from "./actions";
import type { ImportPreview, ImportResult } from "@/server/imports";

const TEMPLATE = "sku,name,barcode,brand,category,unit,costPrice,salePrice,minStock,maxStock,currentStock,status\nSKU001,Produto Exemplo,7891234567890,Marca,Categoria,un,10.00,19.90,5,100,20,ativo\n";

export function ImportClient() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreview(null); setResult(null); setError(null);
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) { setError("Arquivo muito grande (limite 4MB)."); return; }
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(f);
  }

  function doPreview() {
    setError(null); setResult(null);
    start(async () => {
      const r = await previewImportAction(text);
      if (!r.ok) { setError(r.error); setPreview(null); return; }
      setPreview(r.preview);
    });
  }
  function doCommit() {
    setError(null);
    start(async () => {
      const r = await commitImportAction(text);
      if (!r.ok) { setError(r.error); return; }
      setResult(r.result); setPreview(null); setText(""); setFileName("");
    });
  }
  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "modelo-produtos.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const canImport = preview && !preview.headerError && preview.importableCount > 0 && !preview.alreadyImported;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="text-sm" />
          <button onClick={downloadTemplate} className="text-sm text-brand hover:underline">Baixar modelo CSV</button>
        </div>
        {fileName && <p className="mt-2 text-xs text-neutral-500">Arquivo: {fileName}</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={doPreview} disabled={pending || !text} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 disabled:opacity-50">
            {pending ? "Processando..." : "Validar e pre-visualizar"}
          </button>
          {canImport && (
            <button onClick={doCommit} disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black hover:bg-brand-dark disabled:opacity-60">
              Confirmar importacao ({preview!.importableCount})
            </button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {result && <p className="mt-3 text-sm text-emerald-600">Importados: {result.imported} · Ja existentes ignorados: {result.skippedExisting} · Invalidos/duplicados no arquivo: {result.skippedInvalid}</p>}
      </div>

      {preview && !preview.headerError && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge label="Linhas" value={preview.totalRows} />
            <Badge label="Validas" value={preview.validCount} tone="text-emerald-600" />
            <Badge label="Importaveis" value={preview.importableCount} tone="text-brand" />
            <Badge label="Ja existentes" value={preview.existingCount} />
            <Badge label="Com erro" value={preview.errorCount} tone="text-red-500" />
            <Badge label="Duplicados no arquivo" value={preview.fileDuplicateCount} tone="text-amber-600" />
          </div>
          {preview.alreadyImported && <p className="text-sm text-amber-600">Este arquivo ja foi importado antes — a confirmacao esta bloqueada.</p>}

          {preview.sample.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-neutral-500">Previa (ate 20 importaveis)</h3>
              <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900"><tr><th className="px-4 py-2 font-medium">Linha</th><th className="px-4 py-2 font-medium">SKU</th><th className="px-4 py-2 font-medium">Nome</th><th className="px-4 py-2 font-medium">Status</th></tr></thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {preview.sample.map((r) => <tr key={r.line}><td className="px-4 py-2 text-neutral-500">{r.line}</td><td className="px-4 py-2">{r.sku}</td><td className="px-4 py-2">{r.name}</td><td className="px-4 py-2">{r.status}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview.errors.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-red-500">Erros por linha (ate 50)</h3>
              <div className="overflow-hidden rounded-2xl border border-red-200 dark:border-red-900/50">
                <table className="w-full text-sm">
                  <thead className="bg-red-50 text-left text-red-600 dark:bg-red-950/30"><tr><th className="px-4 py-2 font-medium">Linha</th><th className="px-4 py-2 font-medium">Problemas</th></tr></thead>
                  <tbody className="divide-y divide-red-100 dark:divide-red-900/40">
                    {preview.errors.map((e) => <tr key={e.line}><td className="px-4 py-2 text-neutral-500">{e.line}</td><td className="px-4 py-2">{e.messages.join("; ")}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900">
      <span className="text-neutral-500">{label}: </span><span className={`font-semibold tabular-nums ${tone ?? ""}`}>{value}</span>
    </div>
  );
}
