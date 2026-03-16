-- TEMPLATE: Limpeza de dados de teste
-- IMPORTANTE: Revise e execute apenas após backup. Substitua :ORG_ID ou ajuste a cláusula WHERE conforme necessário.
-- Recomendado: executar num transaction e testar com SELECT antes de DELETE.

-- Exemplo de uso (psql): \set ORG 'your-organization-uuid'
--                  :\echo :'ORG'

BEGIN;

-- 1) Opcional: filtrar por organização
-- DELETE FROM ordens_producao WHERE organization_id = :'ORG';
-- DELETE FROM distribuicao_pedidos WHERE organization_id = :'ORG';
-- DELETE FROM vendas WHERE organization_id = :'ORG'; -- se existir
-- DELETE FROM pedidos WHERE organization_id = :'ORG'; -- se existir
-- DELETE FROM movimentacao_estoque WHERE organization_id = :'ORG';
-- DELETE FROM estoque_produtos WHERE organization_id = :'ORG' AND FALSE; -- cuidado: talvez queira preservar saldo

-- 2) Alternativa por data: apagar dados criados antes de X
-- DELETE FROM ordens_producao WHERE created_at < '2026-03-01';
-- DELETE FROM distribuicao_pedidos WHERE created_at < '2026-03-01';

-- 3) Tabelas que normalmente NÃO devem ser apagadas (mantê-las):
-- produtos_finais, insumos, locais, organizations, users

-- 4) Exemplo seguro: remover apenas registros de teste marcados explicitamente
-- DELETE FROM ordens_producao WHERE metadata->>'test' = 'true' OR notas ILIKE '%teste%';

-- 5) Após revisão, descomente os DELETEs que deseja executar

-- COMMIT ou ROLLBACK conforme resultado dos testes
-- COMMIT;
-- ROLLBACK;

-- Observações:
-- - Faça um backup completo antes de executar (pg_dump).
-- - Execute primeiro SELECTs com as mesmas WHERE para inspecionar linhas que serão removidas.
-- - Se precisar eu adapto para remover por foreign-key cascade ou preservar saldos no estoque.
