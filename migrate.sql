-- ============================================================
-- JADLOG · Migração — execute INTEIRO no Neon SQL Editor
-- ============================================================

-- 1. Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  google_id     TEXT UNIQUE,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. deliveries: trocar coluna profile por user_id
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS user_id INTEGER;
UPDATE deliveries SET user_id = 1 WHERE user_id IS NULL;
ALTER TABLE deliveries ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE deliveries DROP COLUMN IF EXISTS profile;

-- 3. transactions: trocar coluna profile por user_id
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INTEGER;
UPDATE transactions SET user_id = 1 WHERE user_id IS NULL;
ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE transactions DROP COLUMN IF EXISTS profile;

-- 4. Boleta diária
CREATE TABLE IF NOT EXISTS daily_records (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  value_per_delivery  NUMERIC(10,2) NOT NULL DEFAULT 3.50,
  delivered           INTEGER NOT NULL DEFAULT 0,
  scheduled           INTEGER NOT NULL DEFAULT 0,
  occurrences         INTEGER NOT NULL DEFAULT 0,
  expenses            NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);
