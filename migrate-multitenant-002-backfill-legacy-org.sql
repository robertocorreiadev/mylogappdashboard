-- ============================================================
-- JADLOG (MyLog) · Multi-tenant: backfill da organização "Legado"
-- Execute no Neon SQL Editor DEPOIS de migrate-multitenant-001-schema.sql
-- e ANTES de fazer deploy do código da Fase 2 (isolamento por org_id).
--
-- Este script:
--   1. Cria a organização "Legado" para abrigar todos os usuários
--      atuais (pré-multi-tenant).
--   2. Dá papel "gestor" ao usuário ADMIN_EMAIL (ele tem dados
--      operacionais próprios reais — 107 boletas, confirmado por
--      query manual em 2026-09-24 — por isso recebe TAMBÉM o papel
--      "entregador" na mesma org, dual-role, para não perder a
--      capacidade de editar os próprios registros).
--   3. Dá papel "entregador" a todos os usuários (incluindo o
--      ADMIN_EMAIL, por causa do dual-role acima).
--   4. Preenche organization_id em daily_records/deliveries/transactions.
--   5. Só marca as colunas como NOT NULL depois de confirmar que
--      não sobrou nenhuma linha sem organization_id.
--
-- Pré-requisito: migrate-multitenant-001-schema.sql (ou, numa instância
-- que já rodou a versão antiga dele, migrate-multitenant-001b-dual-role-index.sql)
-- já aplicado, com o índice memberships_one_active_role_per_user
-- (1 membership ativa POR PAPEL por usuário — permite gestor+entregador
-- simultâneos, nunca dois "gestor" nem dois "entregador" ativos).
-- ============================================================

BEGIN;

-- 1. Organização Legado, de propriedade do super-admin (ADMIN_EMAIL).
INSERT INTO organizations (name, slug, owner_user_id)
SELECT 'Legado', 'legado', id
FROM users
WHERE email = 'contatorobertocorreia@gmail.com'
ON CONFLICT (slug) DO NOTHING;

-- 2. Membership do super-admin como gestor da org Legado.
INSERT INTO memberships (organization_id, user_id, role)
SELECT o.id, u.id, 'gestor'
FROM organizations o, users u
WHERE o.slug = 'legado' AND u.email = 'contatorobertocorreia@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM memberships m WHERE m.user_id = u.id AND m.role = 'gestor' AND m.status = 'active'
  );

-- 3. Membership de TODOS os usuários (incluindo ADMIN_EMAIL, dual-role)
--    como entregador da org Legado.
INSERT INTO memberships (organization_id, user_id, role)
SELECT o.id, u.id, 'entregador'
FROM organizations o, users u
WHERE o.slug = 'legado'
  AND NOT EXISTS (
    SELECT 1 FROM memberships m WHERE m.user_id = u.id AND m.role = 'entregador' AND m.status = 'active'
  );

-- 4. Backfill de organization_id nas tabelas operacionais.
UPDATE daily_records dr
SET organization_id = m.organization_id
FROM memberships m
WHERE m.user_id = dr.user_id AND m.status = 'active' AND dr.organization_id IS NULL;

UPDATE deliveries d
SET organization_id = m.organization_id
FROM memberships m
WHERE m.user_id = d.user_id AND m.status = 'active' AND d.organization_id IS NULL;

UPDATE transactions t
SET organization_id = m.organization_id
FROM memberships m
WHERE m.user_id = t.user_id AND m.status = 'active' AND t.organization_id IS NULL;

COMMIT;

-- ============================================================
-- VERIFICAÇÃO OBRIGATÓRIA — rode manualmente antes de prosseguir.
-- As três contagens abaixo devem retornar 0 antes de aplicar o
-- NOT NULL logo em seguida. Se algo for > 0, INVESTIGUE (provável
-- usuário órfão sem membership) antes de continuar.
--
--   SELECT count(*) FROM daily_records WHERE organization_id IS NULL;
--   SELECT count(*) FROM deliveries    WHERE organization_id IS NULL;
--   SELECT count(*) FROM transactions  WHERE organization_id IS NULL;
-- ============================================================

-- Só rode o bloco abaixo depois de confirmar as três contagens = 0.
-- ALTER TABLE daily_records ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE deliveries    ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE transactions  ALTER COLUMN organization_id SET NOT NULL;
