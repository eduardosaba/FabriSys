-- CORREÇÃO FINAL: Remover todas as políticas e recriar apenas a necessária
-- Execute este SQL no Supabase Dashboard

-- 1. Verificar TODAS as políticas atuais
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'produtos_finais'
ORDER BY policyname;

-- 2. Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Acesso total para admin" ON produtos_finais;
DROP POLICY IF EXISTS "Admin e fábrica têm acesso total" ON produtos_finais;
DROP POLICY IF EXISTS "produtos_finais_admin_fabrica" ON produtos_finais;
DROP POLICY IF EXISTS "Fábrica pode visualizar produtos" ON produtos_finais;
DROP POLICY IF EXISTS "PDV pode visualizar produtos ativos" ON produtos_finais;

-- 3. Verificar que não há mais políticas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'produtos_finais';

-- 4. Criar apenas as políticas necessárias
-- Política para admin e fábrica: acesso total
CREATE POLICY "admin_fabrica_full_access"
  ON produtos_finais
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'fabrica'));

-- Política para fábrica: apenas leitura (já existia)
CREATE POLICY "fabrica_read_only"
  ON produtos_finais
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'fabrica');

-- Política para PDV: apenas produtos ativos (já existia)
CREATE POLICY "pdv_read_active_only"
  ON produtos_finais
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'pdv' AND ativo = true);

-- 5. Verificar resultado final
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'produtos_finais'
ORDER BY policyname;