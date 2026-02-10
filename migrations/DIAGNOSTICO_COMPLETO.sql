-- DIAGNÓSTICO COMPLETO - Execute tudo de uma vez

-- 1. Verificar sua role atual
SELECT 
  'MEU USUÁRIO:' as info,
  auth.uid() as user_id,
  auth.jwt() ->> 'role' as user_role,
  auth.jwt() ->> 'email' as user_email;

-- 2. Verificar se as políticas estão ativas
SELECT 
  'POLÍTICAS ATIVAS:' as info,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'fichas_tecnicas'
ORDER BY policyname;

-- 3. Testar a condição da política de INSERT
SELECT 
  'TESTE DE PERMISSÃO:' as info,
  CASE 
    WHEN (auth.jwt() ->> 'role') IN ('admin', 'fabrica') THEN 'PERMITIDO ✓'
    ELSE 'NEGADO ✗ - Sua role: ' || COALESCE(auth.jwt() ->> 'role', 'NULL')
  END as resultado;

-- 4. Se sua role for NULL ou não for admin/fabrica, execute isto:
-- DESCOMENTE e substitua o email:
/*
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE id = auth.uid();
*/

-- 5. Verificar se existem os IDs dos produtos e insumos
SELECT 
  'VERIFICANDO IDs:' as info,
  (SELECT COUNT(*) FROM produtos_finais WHERE id = '9656ba77-639d-45e0-8dfa-86818a858cac') as produto_existe,
  (SELECT COUNT(*) FROM insumos WHERE id = '70c69065-1523-4ab6-ba5f-38b68708934a') as insumo1_existe,
  (SELECT COUNT(*) FROM insumos WHERE id = 'fa82ec25-4caf-4ab4-99f4-f444f9e03be4') as insumo2_existe;
