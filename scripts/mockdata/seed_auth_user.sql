-- Seed de usuário em auth.users e profiles para testes locais
-- Uso: execute no SQL Editor do Supabase (apenas em desenvolvimento)

BEGIN;

-- Usuário usado em scripts/mockdata/ficha.json (created_by)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'mock.user+ficha@example.com',
  crypt('changeme', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"nome": "Mock User Ficha"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Criar perfil correspondente (se tabela existir)
INSERT INTO profiles (id, role, nome, email, created_at, updated_at)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  'fabrica',
  'Mock User Ficha',
  'mock.user+ficha@example.com',
  NOW(),
  NOW()
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  updated_at = EXCLUDED.updated_at;

COMMIT;

-- Nota:
-- - Executar somente em ambiente de desenvolvimento/admin. Não coloque senhas reais em produção.
-- - Se seu ambiente de Supabase bloqueia escrita direta em auth.users, use a Admin API para criar o usuário.
