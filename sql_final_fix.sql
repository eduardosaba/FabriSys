-- DEBUG: Verificar e recriar política com nome diferente
-- Execute este SQL no Supabase Dashboard

-- Verificar políticas atuais
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'produtos_finais';

-- Remover política existente se houver
DROP POLICY IF EXISTS "Admin e fábrica têm acesso total" ON produtos_finais;

-- Criar nova política com nome diferente
CREATE POLICY "produtos_finais_admin_fabrica"
  ON produtos_finais
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'fabrica'));

-- Verificar resultado
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'produtos_finais';