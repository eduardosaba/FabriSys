-- Criar usuários de teste diretamente na tabela auth.users
-- Execute este script no SQL Editor do Supabase

-- Usuário Admin
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'sababrtv@gmail.com',
  crypt('admin123', gen_salt('bf', 10)),
  NOW(),
  NOW(),
  NOW(),
  '{"nome": "Administrador"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Usuário Fabrica
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'eduardosaba.rep@gmail.com',
  crypt('fabrica123', gen_salt('bf', 10)),
  NOW(),
  NOW(),
  NOW(),
  '{"nome": "Usuario Fabrica"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Usuário PDV
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'eduardosaba@uol.com',
  crypt('pdv123', gen_salt('bf', 10)),
  NOW(),
  NOW(),
  NOW(),
  '{"nome": "Usuario PDV"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Inserir perfis na tabela profiles
INSERT INTO profiles (id, role, nome, email, created_at, updated_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'admin', 'Administrador', 'sababrtv@gmail.com', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'fabrica', 'Usuario Fabrica', 'eduardosaba.rep@gmail.com', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'pdv', 'Usuario PDV', 'eduardosaba@uol.com', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  updated_at = NOW();