-- SOLUÇÃO COMPLETA: Todas as opções para corrigir permissões de produtos_finais
-- Execute este SQL no Supabase Dashboard

-- ===========================================
-- 1. DIAGNÓSTICO: Verificar estado atual
-- ===========================================

-- Verificar todas as políticas atuais
SELECT 'POLÍTICAS ATUAIS:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'produtos_finais'
ORDER BY policyname;

-- Verificar se RLS está habilitado
SELECT 'RLS HABILITADO:' as info, schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'produtos_finais';

-- Verificar conteúdo do JWT atual (se logado)
SELECT 'JWT CONTENT:' as info, auth.jwt() as jwt_content;

-- ===========================================
-- 2. RESET COMPLETO: Remover tudo
-- ===========================================

-- Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Acesso total para admin" ON produtos_finais;
DROP POLICY IF EXISTS "Admin e fábrica têm acesso total" ON produtos_finais;
DROP POLICY IF EXISTS "produtos_finais_admin_fabrica" ON produtos_finais;
DROP POLICY IF EXISTS "admin_fabrica_full_access" ON produtos_finais;
DROP POLICY IF EXISTS "fabrica_read_only" ON produtos_finais;
DROP POLICY IF EXISTS "pdv_read_active_only" ON produtos_finais;
DROP POLICY IF EXISTS "allow_all_for_admin_fabrica" ON produtos_finais;

-- Verificar que não há mais políticas
SELECT 'APÓS REMOÇÃO:' as info;
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'produtos_finais';

-- ===========================================
-- 3. SOLUÇÃO 1: Política simplificada
-- ===========================================

CREATE POLICY "admin_fabrica_full_access_simple"
  ON produtos_finais
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'fabrica'));

-- ===========================================
-- 4. SOLUÇÃO 2: Desabilitar RLS (TESTE TEMPORÁRIO)
-- ===========================================

-- ⚠️ COMENTADO PARA SEGURANÇA - DESCOMENTE APENAS PARA TESTE
-- ALTER TABLE produtos_finais DISABLE ROW LEVEL SECURITY;

-- ===========================================
-- 5. TESTE DIRETO: Tentar inserir via SQL
-- ===========================================

-- Teste de inserção direta (deve funcionar se política estiver correta)
INSERT INTO produtos_finais (nome, preco_venda, ativo, descricao)
VALUES ('Produto Teste SQL Direct', 123.45, true, 'Criado via SQL direto para teste');

-- Verificar se foi inserido
SELECT 'PRODUTO INSERIDO:' as info, id, nome, preco_venda, ativo
FROM produtos_finais
WHERE nome = 'Produto Teste SQL Direct';

-- ===========================================
-- 6. VERIFICAÇÃO FINAL
-- ===========================================

-- Políticas finais
SELECT 'POLÍTICAS FINAIS:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'produtos_finais'
ORDER BY policyname;

-- Status RLS
SELECT 'STATUS RLS FINAL:' as info, schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'produtos_finais';

-- Contagem de produtos
SELECT 'TOTAL PRODUTOS:' as info, COUNT(*) as total
FROM produtos_finais;

-- ===========================================
-- INSTRUÇÕES PARA O USUÁRIO:
-- ===========================================
/*
1. Execute todo este SQL
2. Verifique se aparece "PRODUTO INSERIDO" - isso confirma que funcionou
3. Se aparecer erro na inserção, descomente a linha do DISABLE ROW LEVEL SECURITY
4. Teste no frontend com usuário fábrica
5. Se funcionar, RECOMENTE reabilitar RLS com: ALTER TABLE produtos_finais ENABLE ROW LEVEL SECURITY;
*/