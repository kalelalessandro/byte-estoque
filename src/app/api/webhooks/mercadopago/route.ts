import { handleWebhook, InvalidWebhookSignatureError } from "@/server/payments";
import { ProviderNotConfiguredError } from "@/lib/payments/provider";

export async function POST(req: Request) {
  const rawBody = await req.text(); // corpo CRU para validar a assinatura
  const url = new URL(req.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { query[k] = v; });
  const headers: Record<string, string | undefined> = {
    "x-signature": req.headers.get("x-signature") ?? undefined,
    "x-request-id": req.headers.get("x-request-id") ?? undefined,
  };

  try {
    const outcome = await handleWebhook({ rawBody, headers, query });
    return Response.json({ outcome }, { status: 200 }); // 200 rapido; MP reenvia em 5xx
  } catch (e) {
    if (e instanceof InvalidWebhookSignatureError) return new Response("assinatura invalida", { status: 401 });
    if (e instanceof ProviderNotConfiguredError) return new Response("gateway nao configurado", { status: 503 });
    return new Response("erro ao processar", { status: 500 });
  }
}

// MP as vezes faz um GET de verificacao.
export async function GET() { return new Response("ok", { status: 200 }); }
