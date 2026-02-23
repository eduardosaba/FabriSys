-- Migração: adiciona colunas mínimas na tabela `profiles` e cria `settings` se necessário
-- Data: 2026-02-22

-- OBS: Use com cuidado. Execute em um ambiente de staging antes de production.

-- Cria tabela `profiles` mínima se não existir (não altera estrutura existente quando tabela já existe)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  full_name text,
  store_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user',
  whatsapp text,
  updated_at timestamptz DEFAULT now()
);

-- Se a tabela já existir, adiciona colunas que podem estar ausentes
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS store_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Garante que não existem valores nulos em `role` e força o default
UPDATE profiles SET role = 'user' WHERE role IS NULL;
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;

-- Cria tabela `settings` (opcional) para armazenar telefone/contato do usuário
CREATE TABLE IF NOT EXISTS settings (
  user_id uuid PRIMARY KEY,
  phone text,
  updated_at timestamptz DEFAULT now()
);

-- (Opcional) Tabela de subscriptions — a página tenta ler, mas tolera ausência.
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  plan_name text,
  status text,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Regras RLS exemplo (descomente se estiver usando row level security)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY profiles_own_access ON profiles
--   FOR ALL
--   USING (auth.uid() = id)
--   WITH CHECK (auth.uid() = id);

-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY settings_own_access ON settings
--   FOR ALL
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- Observações:
-- - Se o seu projeto já usa outra tabela (ex: `colaboradores`) você pode replicar ou criar
--   uma view para manter compatibilidade com o novo código.
-- - Para o bucket `avatars` será necessário criá-lo no Storage do Supabase (público OU usar signed urls).
