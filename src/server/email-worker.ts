// Worker do outbox de e-mail. Reivindica cada item (PENDING/FAILED -> PROCESSING)
// para evitar processamento concorrente duplicado, renderiza o template e envia
// pelo provedor configurado. Sucesso -> SENT; falha -> retry com backoff ate o
// limite -> DEAD. NAO e chamado dentro de nenhuma transacao de negocio.
import { prisma } from "@/lib/prisma";
import { getEmailProvider } from "@/lib/email";
import { renderEmail, type EmailTemplate } from "@/lib/email/templates";
import { nextBackoffMs } from "@/lib/email/retry";

export type OutboxResult = { processed: number; sent: number; failed: number; dead: number };

export async function processOutbox(limit = 20): Promise<OutboxResult> {
  const provider = getEmailProvider();
  const now = new Date();
  const candidates = await prisma.emailOutbox.findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, nextAttemptAt: { lte: now } },
    orderBy: { nextAttemptAt: "asc" }, take: limit,
  });

  const result: OutboxResult = { processed: 0, sent: 0, failed: 0, dead: 0 };
  for (const item of candidates) {
    // Reivindica (evita 2 workers pegarem o mesmo item).
    const claim = await prisma.emailOutbox.updateMany({ where: { id: item.id, status: item.status }, data: { status: "PROCESSING" } });
    if (claim.count === 0) continue;
    result.processed++;
    try {
      const { subject, html, text } = renderEmail(item.template as EmailTemplate, item.payload as Record<string, string | number>);
      await provider.send({ to: item.toEmail, subject, html, text });
      await prisma.emailOutbox.update({ where: { id: item.id }, data: { status: "SENT", sentAt: new Date() } });
      result.sent++;
    } catch (e) {
      const attempts = item.attempts + 1;
      const dead = attempts >= item.maxAttempts;
      await prisma.emailOutbox.update({
        where: { id: item.id },
        data: { status: dead ? "DEAD" : "FAILED", attempts, lastError: e instanceof Error ? e.message.slice(0, 500) : "erro", nextAttemptAt: new Date(Date.now() + nextBackoffMs(attempts)) },
      });
      if (dead) result.dead++; else result.failed++;
    }
  }
  return result;
}
