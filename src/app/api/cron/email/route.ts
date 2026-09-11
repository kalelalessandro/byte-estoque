import { authorizeCron } from "@/lib/cron-auth";
import { processOutbox } from "@/server/email-worker";

export async function POST(req: Request) {
  if (!authorizeCron(req.headers.get("authorization"), process.env.CRON_SECRET)) return new Response("nao autorizado", { status: 401 });
  try {
    const r = await processOutbox();
    return Response.json(r, { status: 200 });
  } catch (e) {
    console.error("[cron:email] falhou:", e);
    return new Response("erro", { status: 500 });
  }
}
