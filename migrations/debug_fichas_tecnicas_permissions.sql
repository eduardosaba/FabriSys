-- Script de diagnóstico para verificar permissões de fichas_tecnicas
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar o usuário atual e sua role
SELECT 
  auth.uid() as user_id,
  auth.jwt() ->> 'role' as user_role,
  auth.jwt() ->> 'email' as user_email;

-- 2. Verificar RLS está habilitado
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'fichas_tecnicas';

-- 3. Listar todas as políticas ativas
SELECT 
  pol.schemaname,
  pol.tablename,
  pol.policyname,
  pol.permissive,
  pol.roles,
  CASE pol.cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
    ELSE pol.cmd
  END as operation,
  pg_get_expr(polqual, polrelid) as using_expression,
  pg_get_expr(polwithcheck, polrelid) as with_check_expression
FROM pg_policies pol
JOIN pg_policy p ON p.polname = pol.policyname
JOIN pg_class c ON c.oid = p.polrelid
WHERE pol.tablename = 'fichas_tecnicas'
ORDER BY pol.policyname;

-- 4. Testar INSERT (este deve funcionar depois da migration 035)
-- DESCOMENTE para testar após executar a migration 035:
/*
INSERT INTO fichas_tecnicas (
  produto_final_id,
  insumo_id,
  quantidade,
  unidade_medida,
  perda_padrao
) VALUES (
  (SELECT id FROM produtos_finais LIMIT 1),
  (SELECT id FROM insumos LIMIT 1),
  1.0,
  'kg',
  0
);
*/
