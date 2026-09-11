"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { previewProductImport, commitProductImport, type ImportPreview, type ImportResult, AlreadyImportedError, TooManyRowsError, ImportLimitError, MAX_IMPORT_ROWS } from "@/server/imports";

const MAX_BYTES = 4 * 1024 * 1024;

export async function previewImportAction(text: string): Promise<{ ok: true; preview: ImportPreview } | { ok: false; error: string }> {
  const { tenantId } = await requirePermission("products:write");
  if (typeof text !== "string" || text.length === 0) return { ok: false, error: "Arquivo vazio." };
  if (text.length > MAX_BYTES) return { ok: false, error: "Arquivo muito grande (limite 4MB)." };
  const preview = await previewProductImport(tenantId, text);
  return { ok: true, preview };
}

export async function commitImportAction(text: string): Promise<{ ok: true; result: ImportResult } | { ok: false; error: string }> {
  const { tenantId, userId } = await requirePermission("products:write");
  if (typeof text !== "string" || text.length === 0) return { ok: false, error: "Arquivo vazio." };
  if (text.length > MAX_BYTES) return { ok: false, error: "Arquivo muito grande (limite 4MB)." };
  try {
    const result = await commitProductImport(tenantId, userId, text);
    revalidatePath("/produtos");
    revalidatePath("/importacao");
    return { ok: true, result };
  } catch (e) {
    if (e instanceof AlreadyImportedError) return { ok: false, error: "Este arquivo ja foi importado antes (protecao contra duplicidade)." };
    if (e instanceof TooManyRowsError) return { ok: false, error: `Arquivo excede ${MAX_IMPORT_ROWS} linhas. Divida em partes.` };
    if (e instanceof ImportLimitError) return { ok: false, error: `Limite do plano: cabem mais ${e.allowed} produto(s). Faca upgrade ou reduza o arquivo.` };
    if (e instanceof Error && e.message.startsWith("Cabecalho")) return { ok: false, error: e.message };
    return { ok: false, error: "Nao foi possivel concluir a importacao." };
  }
}
