-- ============================================================
-- JADLOG (MyLog) · Multi-tenant: permitir dual-role (gestor + entregador)
-- Já executado no Neon em 2026-09-24, registrado aqui só para histórico.
--
-- migrate-multitenant-001-schema.sql originalmente criou o índice
-- memberships_one_active_org_per_user (1 membership ativa por usuário,
-- período). Decisão do produto: um usuário pode acumular 'gestor' +
-- 'entregador' simultaneamente na mesma organização (ex.: o dono da
-- operação que também roda entregas). Este script troca o índice para
-- permitir isso, mantendo a garantia de nunca duas memberships do MESMO
-- papel ativas ao mesmo tempo para o mesmo usuário.
--
-- migrate-multitenant-001-schema.sql já foi atualizado para criar
-- diretamente o índice correto (memberships_one_active_role_per_user) —
-- este arquivo só documenta a correção aplicada manualmente numa instância
-- que já tinha rodado a versão antiga do script 001.
-- ============================================================

DROP INDEX IF EXISTS memberships_one_active_org_per_user;
CREATE UNIQUE INDEX IF NOT EXISTS memberships_one_active_role_per_user
  ON memberships(user_id, role) WHERE status = 'active';
