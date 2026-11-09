-- ============================================================
-- JADLOG · Migração completa do banco de dados
-- Execute este arquivo no seu PostgreSQL antes de rodar o app
-- ============================================================

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT,
  google_id      TEXT UNIQUE,
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Boleta diária de entregas
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

-- Entregas individuais (rastreio)
CREATE TABLE IF NOT EXISTS deliveries (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tracking_code TEXT NOT NULL,
  recipient     TEXT NOT NULL,
  address       TEXT,
  city          TEXT,
  status        TEXT NOT NULL DEFAULT 'pendente',
  value         NUMERIC(10,2) NOT NULL DEFAULT 0,
  deadline      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transações financeiras
CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'receita',
  description TEXT NOT NULL,
  category    TEXT,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
