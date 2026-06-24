-- ============================================================
-- JADLOG · Migração completa — cole TUDO no Neon SQL Editor
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

-- 2. Atualizar deliveries: trocar profile por user_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deliveries' AND column_name='user_id') THEN
    ALTER TABLE deliveries ADD COLUMN user_id INTEGER;
    UPDATE deliveries SET user_id = 1 WHERE user_id IS NULL;
    ALTER TABLE deliveries ALTER COLUMN user_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deliveries' AND column_name='profile') THEN
    ALTER TABLE deliveries DROP COLUMN profile;
  END IF;
END $$;

-- 3. Atualizar transactions: trocar profile por user_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='user_id') THEN
    ALTER TABLE transactions ADD COLUMN user_id INTEGER;
    UPDATE transactions SET user_id = 1 WHERE user_id IS NULL;
    ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='profile') THEN
    ALTER TABLE transactions DROP COLUMN profile;
  END IF;
END $$;

-- 4. Tabela de boletas diárias
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
