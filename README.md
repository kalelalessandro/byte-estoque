# Byte Force

SaaS multi-tenant de gestao empresarial. Regua do projeto: uma funcionalidade so
conta como pronta quando frontend + backend + banco + validacao + autorizacao +
tratamento de erro + testes estao integrados. Sem telas falsas, sem mock permanente.

## Stack
Next.js 15 (App Router) · TypeScript estrito · Tailwind · Auth.js v5 ·
PostgreSQL · Prisma · Vitest · ESLint · Docker.

## Implementado (real e integrado)
- **Landing page** comercial (identidade ByteForce: escuro + ciano) com hero,
  recursos, planos, FAQ e CTA — CTAs levam ao cadastro real.
- **Auth**: login, logout, senha bcrypt, sessao JWT com tenant + role; usuario
  inativo bloqueado no login.
- **Signup/onboarding**: cria conta + empresa atomicamente; empresa nasce vazia.
- **Multi-tenancy + RLS**: isolamento no Postgres em todas as tabelas de negocio.
- **RBAC server-side**: 8 papeis, permissoes por modulo/acao, checadas em toda
  action e pagina.
- **Entitlements/limites por plano** (STARTER/PRO/BUSINESS/ENTERPRISE), aplicados
  na criacao de produtos, clientes e fornecedores.
- **Produtos**: CRUD, soft delete, marca, estoque min/max, alerta de baixo.
- **Clientes / Fornecedores**: CRUD + busca + paginacao + estado vazio.
- **Estoque**: movimentacoes transacionais (entrada/saida/ajuste), saldo por
  movimento, historico, **saida a prova de corrida** (sem oversell).
- **Compras**: cabecalho + itens; ao registrar, da entrada no estoque e (se houver
  vencimento) gera conta a pagar — tudo numa transacao. Cancelamento reverte
  estoque e cancela a conta a pagar.
- **Vendas / PDV**: carrinho, formas de pagamento (dinheiro/pix/cartao/a prazo);
  ao finalizar, baixa o estoque (transacional, sem venda parcial) e, se a prazo,
  gera conta a receber. Cancelamento devolve estoque e cancela a receber.
- **Financeiro**: contas a pagar/receber (manuais + geradas por compras/vendas),
  baixa (pagar/receber), marcacao de atraso, resumo em aberto.
- **Caixa**: por filial; abertura com fundo de troco, suprimentos/sangrias, vendas
  em dinheiro entrando automaticamente, fechamento com esperado x contado e diferenca.
- **Relatorios**: vendas, compras, estoque por filial, financeiro e mais vendidos,
  com filtro de periodo e filial e **exportacao CSV real** (rota de download).
  PDF e Excel ainda NAO implementados (sem botao fantasma).
- **LGPD / Privacidade**: exportacao dos dados do tenant em JSON (rota sob RLS, so
  `lgpd:manage` = OWNER/ADMIN, sem senhas/segredos), anonimizacao de dados pessoais
  (clientes/fornecedores/usuarios) e **encerramento de conta** transacional que
  anonimiza pessoais, cancela a assinatura e marca o tenant como encerrado. Faz a
  distincao das 3 categorias: (1) PESSOAIS anonimizados/excluidos; (2) FINANCEIROS/
  FISCAIS retidos (vendas/compras/pagamentos/financeiro/caixa/estoque — o registro
  permanece, a PII referenciada e anonimizada); (3) LOGS de seguranca/auditoria com
  retencao propria. Politica de retencao configuravel/documentada (`lib/lgpd/
  retention.ts`, com "REVISAR prazo"), registro de consentimento (gravado no cadastro)
  e trilha de solicitacoes (`lgpd_requests`) + auditoria. A politica juridica
  definitiva deve ser revisada conforme o contexto da empresa.
- **Notificacoes / e-mail**: notificacoes in-app persistidas e **isoladas por tenant**
  (RLS), com tela de leitura/marcar lida e **preferencias** por usuario. E-mail via
  abstracao `EmailProvider` (Console no dev — nao envia; SMTP real via env), com
  **templates** puros (escapados), **outbox transacional** (a operacao de negocio so
  grava no banco; o envio externo acontece depois num worker), **idempotencia**
  (chave unica no outbox), **retry com backoff e limite** ate DEAD, reivindicacao do
  item para nao processar em duplicidade, e worker exposto em `POST /api/cron/email`.
  Eventos ligados de verdade: estoque baixo, pagamento aprovado/falho e suspensao
  automatica — sempre disparados APOS a operacao, nunca dentro da transacao dela.
- **Super-admin da plataforma**: area propria em `/platform` (fora do (app)),
  autoridade SEPARADA do RBAC de tenant (`isPlatformAdmin`, checado no servidor em
  toda pagina/action). Ve empresas, plano/status das assinaturas, inadimplencia,
  pagamentos (referencias externas, sem dados sensiveis), eventos de webhook (sem
  payload), metricas agregadas e auditoria da plataforma; pode suspender/reativar
  empresa (com auditoria). **Isolamento estrutural**: o RLS foi dividido em dois
  grupos — o platform admin tem bypass explicito (`app.platform='on'`) SO nas
  tabelas administrativas; produtos/clientes/vendas/caixa permanecem inacessiveis
  a ele. Escalada de tenant->PLATFORM_ADMIN e barrada (`assignableByTenantAdmin`).
  Super-admin e criado apenas por ops (`npm run create:platform-admin`), nunca por
  endpoint de tenant.
- **Inadimplencia / suspensao automatica**: endpoint de cron autenticado
  (`POST /api/cron/subscriptions`, `Authorization: Bearer CRON_SECRET`) que varre os
  tenants e aplica a transicao por tempo (TRIALING/ACTIVE -> PAST_DUE -> SUSPENDED;
  cancelamento agendado -> EXPIRED). Protegido contra execucao concorrente por lock
  com lease (`job_locks`), idempotente, com auditoria, logs e tolerancia a falhas
  por tenant. Alem do cron, `getSubscription` reaplica a logica de tempo em toda
  leitura importante (o gate do shell inclusive) — nao dependemos so do cron.
  Reativacao so ocorre com pagamento confirmado (webhook -> ACTIVE).
- **Pagamentos (Mercado Pago, atras da abstracao PaymentProvider)**: criacao de
  checkout/assinatura recorrente (preapproval), Pix/cartao, cancelamento, reembolso
  e consulta de status; **webhook** com verificacao de assinatura HMAC-SHA256 (corpo
  cru), **idempotencia** por (provider, externalId) em webhook_events, persistencia
  dos eventos, e ligacao a maquina de estados (aprovado->ACTIVE, falha/vencido->
  PAST_DUE, cancelado->SUSPENDED) + reconciliacao com o gateway. Payment associa
  tenant e assinatura a cada cobranca. Provedor trocavel por env; Noop quando nao
  configurado (nao simula cobranca).
- **Assinaturas**: maquina de estados real (TRIALING/ACTIVE/PAST_DUE/SUSPENDED/
  CANCELED/EXPIRED), planos mensal/anual, trial de 14 dias, upgrade/downgrade
  (downgrade bloqueado se o uso exceder o novo plano), cancelamento imediato ou no
  fim do periodo, historico de eventos, e **controle de acesso por status** (shell
  redireciona para /assinatura quando bloqueado; banner em trial/past_due).
  Abstracao **PaymentProvider** desacoplada de gateway (provedor Noop enquanto nao
  configurado — nao simula cobranca).
- **Importacao de produtos (CSV)**: upload, validacao de cabecalho/tipos/valores,
  deteccao de duplicados no arquivo e contra o banco, previa sem gravar, relatorio
  de erros por linha, confirmacao, gravacao transacional (produto + estoque na
  filial padrao), respeito ao limite do plano e **protecao contra reimportar o
  mesmo arquivo** (hash unico por tenant). Modelo CSV para download.
- **Filiais e multiplos estoques**: cada tenant tem filiais (filial padrao "Matriz"
  automatica); o estoque e por (produto x filial) em `ProductStock`, com a trava de
  concorrencia no saldo da filial. Estoque, compras, vendas e caixa acontecem numa
  filial. `Product.currentStock` e o total denormalizado, mantido em sincronia.
- **Dashboard**: faturamento do mes, a pagar/receber em aberto, estoque baixo,
  contagens — tudo real do tenant.
- **Auditoria**: audit_logs gravado na mesma transacao das mutacoes.
- **Shell**: sidebar (nav por permissao) + header + dark mode + logo.
- **Testes**: unitarios (RBAC, entitlements, money) + provas de isolamento e de
  concorrencia de estoque. **Docker**: compose sobe Postgres + app com RLS.

## Isolamento de tenant (decisao central)
Dados de negocio carregam `tenant_id` e sao protegidos por Row-Level Security do
Postgres. Toda query passa por `withTenant()` (define `app.current_tenant_id` por
transacao); sem contexto, retorna zero linhas (fail closed). O `tenantId` vem
sempre da sessao (`requireTenant`/`requirePermission`), nunca do frontend.
Identidade (`tenants`, `users`) fica fora do RLS (consultada no login).

## Como rodar (local)
```bash
npm install
cp .env.example .env
npx auth secret            # AUTH_SECRET
# ajuste DATABASE_URL
npm run bootstrap          # migrate + RLS + conta de dev
npm run dev
```
Landing em `/`, cadastro em `/signup`, app em `/dashboard`.
Conta de dev do seed: `owner@demo.com` / `senha123`.

## Como rodar (Docker)
```bash
export AUTH_SECRET="$(openssl rand -base64 33)"
docker compose up --build
```

## Testes
```bash
npm test                    # unitarios (sem banco)
npm run verify:isolation    # RLS: nenhum tenant ve dados de outro (precisa DB)
npm run verify:concurrency  # 20 saidas simultaneas, sem oversell (precisa DB)
npm run lint
```

## Ainda NAO implementado (proximas fases)
Convite/admin de usuarios · Relatorios em PDF/Excel (CSV pronto) · Import/export · Assinaturas +
pagamentos (abstracao de gateway, Pix + recorrencia) + webhooks + inadimplencia ·
Notificacoes (email/in-app) · LGPD (exportar/excluir
conta) · E2E (Playwright) · CI/CD + monitoramento + error tracking + backup.

## Estrutura (resumo)
```
prisma/schema.prisma     modelos (identidade fora do RLS; negocio com tenant_id)
sql/rls.sql              policies de RLS (loop idempotente por tabela)
src/lib/                 tenant, session, rbac/permissions, entitlements, audit, money
src/server/              camadas de dados: products, customers, suppliers, stock,
                         purchases, sales, finance, cash, branches, reports, dashboard
src/app/(app)/           dashboard, produtos, clientes, fornecedores, estoque,
                         compras, vendas, financeiro, caixa, filiais, relatorios, importacao, assinatura, pagamentos, lgpd
src/app/page.tsx         landing;  src/app/login, /signup
scripts/verify-*.ts      provas de isolamento e concorrencia
```


## Validacao pendente (OBRIGATORIA em ambiente com PostgreSQL)
Filiais/Multiplos Estoques e uma AREA CRITICA e foi entregue SEM execucao contra
banco (o sandbox bloqueia o engine do Prisma). Antes de confiar em producao, rodar
e validar:
- prisma generate + typecheck reais (client tipado completo);
- migrations (`prisma migrate`) e aplicacao do `sql/rls.sql`;
- isolamento entre tenants (`npm run verify:isolation`);
- concorrencia de estoque por filial (`npm run verify:concurrency`);
- compras/vendas/caixa por filial (fluxos ponta a ponta);
- criacao automatica da Matriz no signup (contexto de tenant/RLS);
- permissoes de usuario por filial;
- consistencia de Product.currentStock com a soma de ProductStock;
- rollback de transacoes (falha no meio de venda/compra desfaz tudo);
- `next build` de producao.


## Pagamentos — o que voce precisa configurar (e o que falta validar)
Variaveis (`.env`): `PAYMENT_PROVIDER=mercadopago`, `MP_ACCESS_TOKEN`,
`MP_WEBHOOK_SECRET`, `APP_URL` (URL publica). Nenhuma credencial fica no codigo.
No painel do Mercado Pago: criar aplicacao, pegar Access Token (teste e producao),
configurar o Webhook apontando para `APP_URL/api/webhooks/mercadopago` e revelar o
segredo de assinatura.

Separacao honesta do que foi feito:
- VALIDADO LOCALMENTE (testes): verificacao de assinatura HMAC do webhook,
  mapeamento de status, e a maquina de estados da assinatura.
- DEPENDE DO GATEWAY (nao testavel aqui): createCheckout/cancel/refund/
  fetchSubscriptionStatus (chamadas reais a api.mercadopago.com).
- DEPENDE DE WEBHOOK PUBLICO (nao testavel aqui): recebimento real de eventos na
  rota /api/webhooks/mercadopago e a idempotencia gravando em webhook_events.
- TESTES REAIS PENDENTES (com credenciais de sandbox): assinar em sandbox, receber
  o webhook, ver a assinatura virar ACTIVE, simular falha -> PAST_DUE, e reembolso.


## Cron (inadimplencia) — como agendar
Defina `CRON_SECRET` no `.env`. Agende uma chamada periodica (ex.: a cada hora):
- Vercel Cron: adicione em `vercel.json` um cron apontando para
  `/api/cron/subscriptions` (envie o header Authorization com o secret via proxy/
  edge, ou use um secret em query se preferir — o handler espera Bearer).
- GitHub Actions / cron externo: `curl -X POST $APP_URL/api/cron/subscriptions -H "Authorization: Bearer $CRON_SECRET"`.
O job e seguro para rodar com frequencia (idempotente + lock).

Alem do sweep de assinaturas, ha o worker de e-mail: `POST /api/cron/email`
(mesmo `CRON_SECRET`). Agende-o junto (ex.: a cada 1-5 min) para esvaziar o outbox.


## Validacoes externas pendentes (NAO concluidas ate serem executadas)
1. PostgreSQL real: prisma generate/typecheck completos, migrations, RLS,
   isolamento tenant/filial, concorrencia de estoque, compras/vendas/caixa por
   filial, consistencia Product.currentStock x ProductStock, rollback e `next build`.
2. Mercado Pago sandbox: checkout -> pagamento -> webhook -> assinatura ACTIVE ->
   inadimplencia (PAST_DUE/SUSPENDED) -> recuperacao (reativacao) -> reembolso.
Ambas dependem de ambiente/credenciais indisponiveis no sandbox de desenvolvimento.


## E-mail — o que configurar (e o que falta validar)
Env: `EMAIL_PROVIDER` (`console` dev / `smtp` real), `EMAIL_FROM`, e para SMTP:
`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`. Nenhuma
credencial fica no codigo.
- VALIDADO LOCALMENTE (testes): templates (render + escape XSS), politica de retry,
  chave de idempotencia. Persistencia/worker/idempotencia no banco: logica pronta.
- DEPENDE DE SMTP (nao testavel aqui): envio real de e-mail. O provedor Console
  apenas registra no log — NAO envia, e isso esta documentado (nao apresentado como
  envio real).
- TESTE REAL PENDENTE: configurar SMTP e confirmar entrega de um e-mail do outbox.


## Producao — reta final (o que foi adicionado)
- **Relatorios**: exportacao CSV **+ Excel (.xlsx) + PDF** (rota `/api/reports/[type]?format=csv|xlsx|pdf`).
- **Health check**: `GET /api/health` (verifica conectividade do banco; 200/503).
- **Logs estruturados** (`lib/logger.ts`) e **captura de erros** pluggavel (`lib/monitoring.ts`, com gancho para SENTRY_DSN).
- **CI** (`.github/workflows/ci.yml`): quality (install, prisma generate, tsc, lint, test, build) + db-tests (Postgres de servico, migrate, RLS, verify:isolation, verify:concurrency).
- **Backup/recuperacao**: `scripts/backup.sh` (pg_dump) e `scripts/restore.sh` (pg_restore) + `npm run db:backup` / `db:restore`.
- **E2E (Playwright)**: `e2e/critical-flows.spec.ts` (cadastro->dashboard->produto->cliente; login invalido). `npm run test:e2e` — requer app no ar + Postgres.

## ESTADO PARA PRODUCAO — leia antes de vender
### A) 100% implementado E validado no ambiente atual
- Regras puras testadas (58 testes): RBAC, entitlements/limites, dinheiro, saldo de caixa,
  concorrencia (logica), assinatura (maquina de estados), cron-auth, plataforma
  (autoridade + serializadores sem vazamento), CSV, importacao, LGPD (classificacao/
  anonimizacao/autorizacao), assinatura HMAC do Mercado Pago, geracao de XLSX/PDF.
- `tsc` limpo (fora da cascata do client Prisma), `lint` sem avisos.

### B) Implementado, porem NAO validado em ambiente real (precisa de execucao)
- Tudo que depende de PostgreSQL: RLS, isolamento tenant/filial, fronteira do
  PLATFORM_ADMIN, concorrencia real de estoque, compras/vendas/PDV/caixa/financeiro,
  LGPD (export/anonimizacao/encerramento), rollback transacional.
- `prisma validate` / `prisma generate` completo / `migrations` / `next build`:
  NAO executados aqui (o sandbox bloqueia o engine do Prisma).
- Pagamentos Mercado Pago (checkout/cancel/refund/status/webhook): dependem de
  credenciais e webhook publico.
- Envio real de e-mail (SMTP) e o worker do outbox contra o banco.
- E2E Playwright: specs prontos, execucao pendente (app + DB).

### C) O que ainda falta (nao implementado)
- Integracao de nota fiscal (NF-e/NFC-e) — fora do escopo entregue.
- 2FA/MFA, rate limiting em nivel de infra (WAF/reverse proxy), e observabilidade
  externa (APM/Sentry de fato conectado).
- Refino visual/UX final conforme a identidade completa da marca.

### D) Erros encontrados e corrigidos nesta reta final
- Duplicacao de modulo LGPD (meu vs pre-existente) que **duplicava o modelo Prisma
  ConsentRecord** (quebraria o schema): consolidado no modulo unico e duplicata removida.
- `rls.sql` divergente (tabelas de plataforma como email_outbox indo para o RLS):
  reescrito e coerente com o schema (tenant-only x admin-visivel x plataforma).
- Varias correcoes de tipagem pegas pelo `tsc` ao longo dos modulos.

### E) O que configurar externamente para producao
- `DATABASE_URL` (Postgres gerenciado; usuario da app SEM BYPASSRLS), `AUTH_SECRET`.
- Aplicar `sql/rls.sql` apos as migrations; usar `prisma migrate deploy`.
- Pagamentos: `PAYMENT_PROVIDER=mercadopago`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`,
  `APP_URL`; configurar o webhook no painel do MP.
- E-mail: `EMAIL_PROVIDER=smtp`, `EMAIL_FROM`, `SMTP_*`.
- Cron: `CRON_SECRET` + agendador chamando `/api/cron/subscriptions` e `/api/cron/email`.
- Super-admin: criar via `npm run create:platform-admin` (ops).
- Backup: agendar `scripts/backup.sh`. Monitoramento externo: apontar `/api/health`;
  opcional `SENTRY_DSN`.

### F) Checklist final
**AINDA NAO PRONTO PARA VENDA.** O codigo esta implementado e as regras puras estao
testadas (58 testes verdes), mas as duas validacoes criticas **em ambiente real**
seguem PENDENTES e sao pre-requisito de producao:
1. PostgreSQL real: prisma validate/generate/migrations/next build + RLS + isolamento
   tenant/filial + fronteira PLATFORM_ADMIN + concorrencia + compras/vendas/caixa/
   financeiro + LGPD + rollback.
2. Mercado Pago sandbox: checkout -> pago -> webhook -> ACTIVE -> recusa -> PAST_DUE
   -> suspensao -> recuperacao -> cancelamento -> idempotencia.
Alem disso, por o filesystem ter apresentado divergencias em rodadas anteriores,
rodar um `prisma validate` + `tsc` + `next build` num checkout limpo e OBRIGATORIO
no aceite. So considerar "PRONTO PARA VENDA" apos 1 e 2 executados com sucesso.


# ====================================================================
# ENCERRAMENTO DA FASE DE DESENVOLVIMENTO — Validacao & Aceite (AUTORITATIVO)
# Esta secao consolida e prevalece sobre notas anteriores de status.
# ====================================================================

## 1) Implementado
Auth (login/logout, sessao com tenant+role) · Signup/onboarding · Multi-tenancy +
RLS (Postgres) · RBAC server-side · Entitlements/limites por plano · Auditoria ·
Produtos · Clientes · Fornecedores · Estoque (movimentacoes transacionais, saldo
por filial) · Filiais e multiplos estoques · Compras · Vendas/PDV · Caixa ·
Financeiro (a pagar/receber, fluxo) · Dashboard · Relatorios (CSV+Excel+PDF) ·
Importacao CSV · Planos/Assinaturas (maquina de estados) · Pagamentos (Mercado
Pago atras da abstracao PaymentProvider: checkout/cancel/refund/status/webhook) ·
Webhooks idempotentes · Inadimplencia + suspensao automatica (cron) · Super-admin
de plataforma (bypass de RLS so em tabelas admin) · Notificacoes in-app + e-mail
(outbox transacional, retry, idempotencia) · LGPD (export/anonimizacao/
encerramento, classificacao, retencao, consentimento) · Health check · Logs
estruturados + captura de erro · CI (GitHub Actions) · Backup/restore · E2E specs.

## 2) Testado com sucesso NO AMBIENTE ATUAL
- 58 testes unitarios/logica passando (`npm test`).
- `tsc` limpo (fora da cascata do client Prisma incompleto do sandbox) e `lint` sem avisos.
- Cobrem: RBAC, entitlements, dinheiro, caixa, maquina de estados de assinatura,
  cron-auth, autoridade/serializadores de plataforma, CSV, importacao, LGPD,
  assinatura HMAC do webhook Mercado Pago, e geracao real de XLSX/PDF.

## 3) NAO validado (depende de PostgreSQL / ambiente externo)
- `prisma validate`, `prisma generate` completo, `migrations`, `next build`
  (o sandbox bloqueia o engine do Prisma).
- RLS e isolamento entre tenants e entre filiais; fronteira do PLATFORM_ADMIN.
- Concorrencia real de estoque; compras/vendas/PDV/caixa/financeiro end-to-end;
  rollback transacional; LGPD (export/anonimizacao/encerramento) contra o banco.
- Mercado Pago (checkout/pagamento/webhook/refund) e envio real de e-mail (SMTP)
  + worker do outbox; E2E Playwright.

## 4) Passos EXATOS para validar em ambiente real
```bash
# a) Checkout limpo + dependencias
npm ci
# b) Banco (Postgres) e segredo
cp .env.example .env   # preencher DATABASE_URL; depois:
npx auth secret        # AUTH_SECRET
# c) Prisma + schema + RLS
npx prisma validate
npx prisma generate
npx prisma migrate deploy   # (ou: npx prisma db push)
npm run db:rls              # aplica sql/rls.sql
# d) Qualidade/build
npx tsc --noEmit
npm run lint
npm test
npm run build
# e) Provas de banco (RLS/concorrencia)
npm run verify:isolation    # isolamento tenant + filial + fronteira PLATFORM_ADMIN
npm run verify:concurrency  # estoque por filial sem oversell
# f) App + super-admin + seed de dev
npm run db:seed
PLATFORM_ADMIN_EMAIL=... PLATFORM_ADMIN_PASSWORD=... npm run create:platform-admin
npm run dev
# g) E2E (app no ar + DB)
npm run test:e2e
# h) Mercado Pago (sandbox): configurar env, expor URL publica, e validar
#    checkout -> pago -> webhook -> ACTIVE -> recusa -> PAST_DUE -> suspensao
#    -> recuperacao -> cancelamento -> idempotencia.
# i) Cron: agendar POST /api/cron/subscriptions e /api/cron/email (Bearer CRON_SECRET)
```

## 5) Variaveis de ambiente para producao
- `DATABASE_URL` (Postgres; usuario da app SEM BYPASSRLS)
- `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST=true`
- `APP_URL` (URL publica)
- Pagamentos: `PAYMENT_PROVIDER=mercadopago`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`
- E-mail: `EMAIL_PROVIDER=smtp`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
- Cron: `CRON_SECRET`
- Retencao (opcional): `RETENTION_FINANCIAL_DAYS`, `RETENTION_SECURITY_DAYS`
- Observabilidade (opcional): `SENTRY_DSN`
- Ops (fora do app): `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`

## 6) Checklist PRONTO PARA VENDA
- [x] Codigo implementado e regras puras testadas (58 testes) + tsc/lint limpos
- [ ] `prisma validate` + `generate` + `migrate` + `next build` num checkout limpo
- [ ] RLS + isolamento tenant/filial + fronteira PLATFORM_ADMIN (verify:isolation)
- [ ] Concorrencia de estoque (verify:concurrency)
- [ ] Fluxos end-to-end (E2E) com app + Postgres
- [ ] Mercado Pago sandbox: ciclo completo de cobranca + idempotencia
- [ ] Envio real de e-mail (SMTP) confirmado
- [ ] Backup/restore testados; cron agendado; health check monitorado

STATUS: **AINDA NAO PRONTO PARA VENDA** — os itens nao marcados acima exigem
execucao em ambiente real (Postgres + Mercado Pago sandbox + SMTP). Sao esperados,
e nenhum foi marcado como concluido sem execucao.
