import { requirePermission } from "@/lib/rbac";
import { ImportClient } from "./import-client";

export default async function ImportacaoPage() {
  await requirePermission("products:write"); // so quem cria produto importa
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importacao de produtos</h1>
        <p className="text-sm text-neutral-500">Envie um CSV, valide, revise a previa e confirme. Produtos ja existentes (por SKU) sao ignorados.</p>
      </div>
      <ImportClient />
    </div>
  );
}
