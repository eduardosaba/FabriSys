-- Script para criar usuários de teste
-- Execute este script APENAS no ambiente de desenvolvimento

-- Primeiro criar os usuários em auth.users (garante que a FK de profiles seja satisfeita)
-- Observação: inserir diretamente em auth.users pode exigir permissões de administrador.
-- Se o seu ambiente não permitir, crie os usuários via Admin API do Supabase.

-- Usuário Admin - Verificar se já existe antes de inserir
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
SELECT
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'sababrtv@gmail.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"nome": "Administrador"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'sababrtv@gmail.com'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Usuário Fabrica - Verificar se já existe antes de inserir
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
SELECT
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'eduardosaba.rep@gmail.com',
  crypt('fabrica123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"nome": "Usuario Fabrica"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'eduardosaba.rep@gmail.com'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Usuário PDV - Verificar se já existe antes de inserir
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
SELECT
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'eduardosaba84@gmail.com',
  crypt('pdv123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"nome": "Usuario PDV"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'eduardosaba84@gmail.com'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Depois criar/atualizar os perfis (agora a FK será satisfeita)
DELETE FROM profiles WHERE email LIKE '%@sistema-lari.com';

INSERT INTO profiles (id, role, nome, email, created_at, updated_at)
SELECT
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'admin',
  'Administrador',
  'sababrtv@gmail.com',
  NOW(),
  NOW()
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE id = '550e8400-e29b-41d4-a716-446655440000'::uuid
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  updated_at = EXCLUDED.updated_at;

INSERT INTO profiles (id, role, nome, email, created_at, updated_at)
SELECT
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'fabrica',
  'Usuario Fabrica',
  'eduardosaba.rep@gmail.com',
  NOW(),
  NOW()
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE id = '550e8400-e29b-41d4-a716-446655440001'::uuid
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  updated_at = EXCLUDED.updated_at;

INSERT INTO profiles (id, role, nome, email, created_at, updated_at)
SELECT
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'pdv',
  'Usuario PDV',
  'eduardosaba84@gmail.com',
  NOW(),
  NOW()
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE id = '550e8400-e29b-41d4-a716-446655440002'::uuid
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  updated_at = EXCLUDED.updated_at;

-- Instruções de uso:
-- 1. Execute a migração 018_create_profiles_table.sql primeiro
-- 2. Execute este script para criar usuários de teste
-- 3. Use as credenciais abaixo para testar o login:
--
-- Admin: sababrtv@gmail.com / admin123
-- Fábrica: eduardosaba.rep@gmail.com / fabrica123
-- PDV: eduardosaba84@gmail.com / pdv123