-- Verificar e corrigir políticas de produtos_finais
-- Execute este SQL no Supabase Dashboard

-- 1. Verificar TODAS as políticas atuais
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, definition
FROM pg_policies
WHERE tablename = 'produtos_finais'
ORDER BY policyname;

-- 2. Remover todas as políticas conflitantes (se necessário)
-- DROP POLICY IF EXISTS "Acesso total para admin" ON produtos_finais;
-- DROP POLICY IF EXISTS "Admin e fábrica têm acesso total" ON produtos_finais;

-- 3. Criar política correta com sintaxe completa
CREATE POLICY "admin_fabrica_full_access"
  ON produtos_finais
  FOR ALL
  TO authenticated
  USING (
    CASE
      WHEN auth.jwt() ->> 'role' = 'admin' THEN true
      WHEN auth.jwt() ->> 'role' = 'fabrica' THEN true
      ELSE false
    END
  );

-- 4. Verificar novamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, definition
FROM pg_policies
WHERE tablename = 'produtos_finais'
ORDER BY policyname;