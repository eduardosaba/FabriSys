-- Verificar e corrigir JWT claims para incluir role
-- Execute este SQL no Supabase Dashboard

-- 1. Verificar conteúdo atual do JWT
SELECT 'JWT CONTENT:' as info, auth.jwt() as jwt_content;

-- 2. Verificar perfil do usuário atual
SELECT id, role, nome, email FROM profiles WHERE id = auth.uid();

-- 3. Criar função para obter JWT com claims customizados (se necessário)
-- Esta função pode ser chamada pelo cliente para obter um JWT válido
CREATE OR REPLACE FUNCTION public.get_jwt_with_role()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile profiles;
  jwt_claims jsonb;
BEGIN
  -- Buscar perfil do usuário
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = auth.uid();

  IF user_profile IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;

  -- Criar claims do JWT
  jwt_claims := jsonb_build_object(
    'role', user_profile.role,
    'user_id', user_profile.id,
    'email', user_profile.email
  );

  RETURN jwt_claims;
END;
$$;

-- 4. Verificar se podemos usar a função auth.jwt() corretamente
-- Para isso funcionar, o Supabase precisa estar configurado para incluir claims customizados
-- Ou podemos modificar as políticas para usar uma subquery

-- 5. Alternativa: modificar política para usar subquery em vez de auth.jwt()
DROP POLICY IF EXISTS "produtos_finais_admin_fabrica" ON produtos_finais;

CREATE POLICY "produtos_finais_admin_fabrica"
  ON produtos_finais
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'fabrica')
    )
  );

-- 6. Verificar resultado
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'produtos_finais';