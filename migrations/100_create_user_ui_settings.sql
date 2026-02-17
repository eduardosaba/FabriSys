-- Migration: criar tabela para persistir posições UI por usuário
BEGIN;

CREATE TABLE IF NOT EXISTS user_ui_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  key text NOT NULL,
  value jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_ui_settings_user_key_idx ON user_ui_settings (user_id, key);

-- Habilitar RLS e política básica que permite que cada usuário leia/escreva suas próprias linhas
ALTER TABLE user_ui_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_manage_own_settings" ON user_ui_settings;
CREATE POLICY "users_can_manage_own_settings" ON user_ui_settings
  USING (user_id = auth.uid()::uuid)
  WITH CHECK (user_id = auth.uid()::uuid);

COMMIT;
