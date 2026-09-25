-- ============================================================
-- JADLOG (MyLog) · Multi-tenant: novas tabelas + colunas
-- Execute no Neon SQL Editor ANTES de fazer deploy do código
-- que depende deste schema (padrão manual do projeto).
--
-- Este script é aditivo e seguro: não altera nem remove nada
-- que já existe. As colunas organization_id novas começam
-- NULLABLE de propósito (nenhum código ainda as lê/escreve).
-- Passo 2 (migrate-multitenant-002-backfill-legacy-org.sql)
-- faz o backfill e só então marca as colunas como NOT NULL.
-- ============================================================

-- Organização = a empresa/gestor terceiro
CREATE TABLE IF NOT EXISTS organizations (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  owner_user_id  INTEGER NOT NULL REFERENCES users(id),
  status         TEXT NOT NULL DEFAULT 'active', -- 'active' | 'suspended'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vínculo user <-> org com papel. Um usuário pode ter no máximo UMA membership
-- ativa POR PAPEL (índice único parcial abaixo garante isso) — ou seja, pode
-- acumular 'gestor' + 'entregador' simultaneamente (dual-role, ex.: o dono da
-- operação que também roda entregas), mas nunca duas memberships 'gestor' nem
-- duas 'entregador' ativas ao mesmo tempo. A UI só expõe o seletor de modo
-- (gestor/entregador) para quem de fato tem as duas ativas — um entregador
-- comum nunca vê nada relacionado a gestor.
CREATE TABLE IF NOT EXISTS memberships (
  id                  SERIAL PRIMARY KEY,
  organization_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role                TEXT NOT NULL, -- 'gestor' | 'entregador'
  status              TEXT NOT NULL DEFAULT 'active', -- 'active' | 'removed'
  invited_by_user_id  INTEGER REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at          TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS memberships_one_active_role_per_user
  ON memberships(user_id, role) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS memberships_org_id_idx ON memberships(organization_id);

-- Convites: token de alta entropia, armazenado só como hash (nunca em texto puro).
CREATE TABLE IF NOT EXISTS invites (
  id                    SERIAL PRIMARY KEY,
  organization_id       INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token_hash            TEXT NOT NULL UNIQUE, -- sha256(token) hex
  role                  TEXT NOT NULL DEFAULT 'entregador',
  email                 TEXT, -- opcional: restringe aceite a um e-mail específico
  created_by_user_id    INTEGER NOT NULL REFERENCES users(id),
  expires_at            TIMESTAMPTZ NOT NULL,
  accepted_at           TIMESTAMPTZ,
  accepted_by_user_id   INTEGER REFERENCES users(id),
  revoked_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS invites_org_id_idx ON invites(organization_id);

-- Auditoria append-only. Nunca ganha UPDATE/DELETE no app — só INSERT.
CREATE TABLE IF NOT EXISTS audit_logs (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id    INTEGER NOT NULL REFERENCES users(id),
  entity_type      TEXT NOT NULL, -- 'daily_record' | 'delivery' | 'transaction'
  entity_id        INTEGER NOT NULL,
  action           TEXT NOT NULL, -- 'create' | 'update' | 'delete'
  field_changes    JSONB,         -- [{ field, old, new }] — só campos que mudaram
  snapshot_before  JSONB,
  snapshot_after   JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_org_entity_idx  ON audit_logs(organization_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_org_created_idx ON audit_logs(organization_id, created_at DESC);

-- Colunas novas nas tabelas operacionais existentes (NULLABLE por enquanto).
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE deliveries    ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE transactions  ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS daily_records_org_idx ON daily_records(organization_id);
CREATE INDEX IF NOT EXISTS deliveries_org_idx    ON deliveries(organization_id);
CREATE INDEX IF NOT EXISTS transactions_org_idx  ON transactions(organization_id);
