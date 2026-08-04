-- ============================================================
-- JADLOG · Corrigir UNIQUE constraint daily_records
-- O mesmo usuário pode ter o mesmo DIA em painéis diferentes
-- Execute no Neon SQL Editor
-- ============================================================

-- Remove a constraint antiga (user_id, date)
ALTER TABLE daily_records DROP CONSTRAINT IF EXISTS daily_records_user_id_date_key;

-- Cria a constraint correta incluindo o panel
ALTER TABLE daily_records
  ADD CONSTRAINT daily_records_user_id_panel_date_key
  UNIQUE (user_id, panel, date);
