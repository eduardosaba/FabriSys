-- Verificar políticas RLS atuais da tabela produtos_finais
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'produtos_finais'
ORDER BY policyname;

-- Verificar se RLS está habilitado na tabela
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'produtos_finais';