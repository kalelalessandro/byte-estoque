// Templates PUROS (sem DB/rede). Cada evento -> {subject, html, text}.
// Nunca inclua segredos/tokens aqui.
export type EmailTemplate =
  | "invite" | "low_stock" | "payment_approved" | "payment_failed"
  | "subscription_expiring" | "subscription_suspended" | "subscription_recovered";

const esc = (s: string) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
const wrap = (title: string, bodyHtml: string) =>
  `<div style="font-family:sans-serif"><h2>${esc(title)}</h2>${bodyHtml}<p style="color:#888;font-size:12px">ByteForce</p></div>`;

export function renderEmail(template: EmailTemplate, p: Record<string, string | number>): { subject: string; html: string; text: string } {
  switch (template) {
    case "invite":
      return { subject: "Convite para o ByteForce", text: `Voce foi convidado para ${p.company}. Acesse: ${p.link}`, html: wrap("Voce foi convidado", `<p>Voce foi convidado para <b>${esc(String(p.company))}</b>.</p><p><a href="${esc(String(p.link))}">Aceitar convite</a></p>`) };
    case "low_stock":
      return { subject: `Estoque baixo: ${p.product}`, text: `O produto ${p.product} esta com saldo ${p.balance} (minimo ${p.min}).`, html: wrap("Estoque baixo", `<p>O produto <b>${esc(String(p.product))}</b> esta com saldo <b>${esc(String(p.balance))}</b> (minimo ${esc(String(p.min))}).</p>`) };
    case "payment_approved":
      return { subject: "Pagamento aprovado", text: `Recebemos seu pagamento de R$ ${p.amount}. Assinatura ativa.`, html: wrap("Pagamento aprovado", `<p>Recebemos seu pagamento de <b>R$ ${esc(String(p.amount))}</b>. Sua assinatura esta ativa.</p>`) };
    case "payment_failed":
      return { subject: "Falha no pagamento", text: `Nao conseguimos processar seu pagamento. Regularize para manter o acesso.`, html: wrap("Falha no pagamento", `<p>Nao conseguimos processar seu pagamento. Regularize para manter o acesso.</p>`) };
    case "subscription_expiring":
      return { subject: "Sua assinatura vence em breve", text: `Sua assinatura vence em ${p.date}. Renove para nao perder o acesso.`, html: wrap("Assinatura vencendo", `<p>Sua assinatura vence em <b>${esc(String(p.date))}</b>.</p>`) };
    case "subscription_suspended":
      return { subject: "Assinatura suspensa", text: `Sua assinatura foi suspensa por falta de pagamento.`, html: wrap("Assinatura suspensa", `<p>Sua assinatura foi suspensa. Regularize para reativar.</p>`) };
    case "subscription_recovered":
      return { subject: "Assinatura reativada", text: `Seu pagamento foi confirmado e a assinatura esta ativa novamente.`, html: wrap("Assinatura reativada", `<p>Tudo certo! Sua assinatura esta ativa novamente.</p>`) };
  }
}
