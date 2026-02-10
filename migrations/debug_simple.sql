-- Script de diagnóstico simplificado

-- 1. Verificar sua role
SELECT 
  auth.uid() as user_id,
  auth.jwt() ->> 'role' as user_role,
  auth.jwt() ->> 'email' as user_email;

-- 2. Verificar se RLS está ativo
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'fichas_tecnicas';

-- 3. Listar políticas (versão simplificada)
SELECT 
  policyname,
  roles,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'fichas_tecnicas'
ORDER BY policyname;

-- 4. Verificar se a tabela existe e tem dados
SELECT COUNT(*) as total_fichas FROM fichas_tecnicas;

-- 5. Testar permissão de SELECT
SELECT 'SELECT funciona!' as teste FROM fichas_tecnicas LIMIT 1;
