-- Migração para criar usuário master eduardosaba@uol.com.br
-- Este usuário terá acesso completo ao sistema

-- Criar usuário master em auth.users - Verificar se já existe antes de inserir
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
SELECT
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  'eduardosaba@uol.com.br',
  crypt('Sp230407@', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"nome": "Usuario Master"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'eduardosaba@uol.com.br'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Criar perfil para o usuário master APENAS se o usuário existe
INSERT INTO profiles (id, role, nome, email, created_at, updated_at)
SELECT
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  'master',
  'Usuario Master',
  'eduardosaba@uol.com.br',
  NOW(),
  NOW()
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE id = '550e8400-e29b-41d4-a716-446655440003'::uuid
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  updated_at = EXCLUDED.updated_at;