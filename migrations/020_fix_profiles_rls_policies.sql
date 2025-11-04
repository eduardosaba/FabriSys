-- Corrigir políticas RLS da tabela profiles para evitar recursão infinita
-- O problema é que as políticas de admin consultam a própria tabela profiles

-- Remover TODAS as políticas existentes da tabela profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow public read for development" ON profiles;
DROP POLICY IF EXISTS "Allow public insert for development" ON profiles;
DROP POLICY IF EXISTS "Allow public update for development" ON profiles;

-- Criar políticas corretas que não causam recursão
-- Para usuários autenticados, permitir leitura/escrita do próprio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Para usuários autenticados, permitir inserção do próprio perfil
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Política temporária: permitir leitura pública para desenvolvimento
-- ATENÇÃO: Remover em produção!
CREATE POLICY "Allow public read for development" ON profiles
  FOR SELECT TO public USING (true);

-- Política temporária: permitir inserção pública para desenvolvimento
-- ATENÇÃO: Remover em produção!
CREATE POLICY "Allow public insert for development" ON profiles
  FOR INSERT TO public WITH CHECK (true);

-- Política temporária: permitir atualização pública para desenvolvimento
-- ATENÇÃO: Remover em produção!
CREATE POLICY "Allow public update for development" ON profiles
  FOR UPDATE TO public USING (true);