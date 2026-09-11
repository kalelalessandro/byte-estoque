// Politica de retencao — CONFIGURAVEL e DOCUMENTADA. Os prazos abaixo sao
// PADROES DE ARQUITETURA, nao aconselhamento juridico: a politica definitiva deve
// ser revisada conforme o contexto (obrigacoes fiscais/contabeis/setoriais) da empresa.
export const RETENTION_POLICY = {
  personalData: { onAccountClosure: "anonimizado imediatamente", note: "nome/documento/contato/endereco de clientes, fornecedores e usuarios" },
  financialRecords: { retain: true, suggestedYears: 5, note: "vendas, compras, pagamentos, financeiro, movimentos de estoque/caixa — REVISAR prazo fiscal/contabil" },
  securityAuditLogs: { retain: true, suggestedMonths: 12, note: "auditoria, webhooks e eventos de assinatura — REVISAR prazo" },
  disclaimer: "Prazos ilustrativos. A politica juridica definitiva deve ser validada por profissional conforme a legislacao aplicavel.",
} as const;
