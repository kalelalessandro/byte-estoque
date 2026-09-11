-- Byte Force — Row-Level Security. Rodar DEPOIS de `prisma migrate`. Idempotente.
--
-- (A) TENANT-ONLY: dados operacionais + LGPD do tenant. So no contexto do tenant.
-- (B) ADMIN-VISIBLE: assinaturas/pagamentos — tenant OU app.platform='on' (bypass
--     explicito do super-admin, setado apenas pelo servidor).
-- FORA do RLS (tabelas de plataforma): tenants, users, webhook_events,
-- payment_events, email_outbox, job_locks, platform_audit_logs.
-- current_setting(nome, true) => NULL/'' se nao setado => fail closed.

-- Grupo A — tenant-only
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','customers','suppliers','stock_movements','purchases','purchase_items',
    'sales','sale_items','finance_entries','cash_registers','cash_movements',
    'branches','product_stocks','import_batches','notifications','notification_preferences',
    'consent_records','lgpd_requests','audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_select ON %I', t);
    EXECUTE format($f$CREATE POLICY tenant_isolation_select ON %I FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)$f$, t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_insert ON %I', t);
    EXECUTE format($f$CREATE POLICY tenant_isolation_insert ON %I FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid)$f$, t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_update ON %I', t);
    EXECUTE format($f$CREATE POLICY tenant_isolation_update ON %I FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid)$f$, t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_delete ON %I', t);
    EXECUTE format($f$CREATE POLICY tenant_isolation_delete ON %I FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)$f$, t);
  END LOOP;
END $$;

-- Grupo B — admin-visible (tenant OU plataforma)
DO $$
DECLARE
  t text;
  cond text := $c$ (tenant_id = current_setting('app.current_tenant_id', true)::uuid) OR (current_setting('app.platform', true) = 'on') $c$;
BEGIN
  FOREACH t IN ARRAY ARRAY['subscriptions','subscription_events','payments']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_select ON %I', t);
    EXECUTE format('CREATE POLICY tenant_isolation_select ON %I FOR SELECT USING (%s)', t, cond);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_insert ON %I', t);
    EXECUTE format('CREATE POLICY tenant_isolation_insert ON %I FOR INSERT WITH CHECK (%s)', t, cond);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_update ON %I', t);
    EXECUTE format('CREATE POLICY tenant_isolation_update ON %I FOR UPDATE USING (%s) WITH CHECK (%s)', t, cond, cond);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_delete ON %I', t);
    EXECUTE format('CREATE POLICY tenant_isolation_delete ON %I FOR DELETE USING (%s)', t, cond);
  END LOOP;
END $$;
