import { authorizeCron } from "@/lib/cron-auth";
import { sweepSubscriptions } from "@/server/dunning";

export async function POST(req: Request) {
  if (!authorizeCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response("nao autorizado", { status: 401 });
  }
  try {
    const summary = await sweepSubscriptions();
    return Response.json(summary, { status: 200 });
  } catch (e) {
    console.error("[cron] sweep falhou:", e);
    return new Response("erro no sweep", { status: 500 });
  }
}
