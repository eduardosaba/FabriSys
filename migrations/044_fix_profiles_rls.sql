-- Migração para corrigir políticas RLS da tabela profiles
-- SOLUÇÃO TEMPORÁRIA: Desabilitar RLS para resolver recursão infinita

-- Desabilitar RLS completamente por enquanto
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes que podem estar causando problemas
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "users_select_own" ON profiles;
DROP POLICY IF EXISTS "users_update_own" ON profiles;
DROP POLICY IF EXISTS "users_insert_own" ON profiles;
DROP POLICY IF EXISTS "service_role_all" ON profiles;
DROP POLICY IF EXISTS "admins_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_master_access" ON profiles;

-- Remover função se existir
DROP FUNCTION IF EXISTS is_admin_or_master(UUID);

-- NOTA: RLS foi desabilitado temporariamente
-- TODO: Implementar políticas RLS adequadas sem recursão infinita