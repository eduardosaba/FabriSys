-- Teste rápido de permissões para produtos_finais
-- Execute este SQL no Supabase Dashboard

-- 1. Verificar se o usuário atual tem as permissões corretas
SELECT
  'User ID:' as info,
  auth.uid() as user_id;

SELECT
  'User Profile:' as info,
  p.id,
  p.role,
  p.nome,
  p.email
FROM profiles p
WHERE p.id = auth.uid();

-- 2. Verificar políticas atuais da tabela produtos_finais
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'produtos_finais'
ORDER BY policyname;

-- 3. Tentar fazer um SELECT simples (deve funcionar se as permissões estiverem corretas)
SELECT
  'Test SELECT:' as info,
  COUNT(*) as total_produtos
FROM produtos_finais;

-- 4. Tentar fazer um UPDATE simples em um produto existente (se houver)
-- Substitua 'ID_DO_PRODUTO' pelo ID real de um produto
SELECT
  'Produtos disponíveis:' as info,
  id,
  nome,
  preco_venda
FROM produtos_finais
LIMIT 5;

-- 5. Teste de UPDATE (descomente e substitua os valores)
-- UPDATE produtos_finais
-- SET nome = nome || ' (teste)'
-- WHERE id = 'ID_DO_PRODUTO'
-- RETURNING id, nome;