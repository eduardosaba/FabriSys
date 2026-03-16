-- LIMPEZA SEGURA DE DADOS DE TESTE PARA A ORGANIZAÇÃO
-- Organização alvo: 89049aea-a737-4374-807c-d1f51dc63f64
-- IMPORTANTE: Faça backup completo antes de executar (pg_dump). Teste as SELECTs abaixo antes de descomentar os DELETEs.

SELECT 'ordens_producao' AS tabela, COALESCE((SELECT reltuples::bigint FROM pg_class WHERE oid = to_regclass('public.ordens_producao')),0) AS approx_count;
SELECT 'distribuicao_pedidos' AS tabela, COALESCE((SELECT reltuples::bigint FROM pg_class WHERE oid = to_regclass('public.distribuicao_pedidos')),0) AS approx_count;
SELECT 'movimentacao_estoque' AS tabela, COALESCE((SELECT reltuples::bigint FROM pg_class WHERE oid = to_regclass('public.movimentacao_estoque')),0) AS approx_count;
SELECT 'vendas' AS tabela, COALESCE((SELECT reltuples::bigint FROM pg_class WHERE oid = to_regclass('public.vendas')),0) AS approx_count;
SELECT 'pedidos' AS tabela, COALESCE((SELECT reltuples::bigint FROM pg_class WHERE oid = to_regclass('public.pedidos')),0) AS approx_count;
SELECT 'alertas_fabrica' AS tabela, COALESCE((SELECT reltuples::bigint FROM pg_class WHERE oid = to_regclass('public.alertas_fabrica')),0) AS approx_count;

-- 2) Segurança: tabelas que NÃO serão removidas por este script
-- produtos_finais, insumos, locais, organizations, users (preservadas)

-- 3) DELETEs SUGERIDOS (descomente apenas após revisão e backup)
BEGIN;

-- Remover ordens de produção de teste
-- DELETE FROM ordens_producao WHERE organization_id = '89049aea-a737-4374-807c-d1f51dc63f64';

-- Remover pedidos de distribuição (expedição)
-- DELETE FROM distribuicao_pedidos WHERE organization_id = '89049aea-a737-4374-807c-d1f51dc63f64';

-- Remover movimentos de estoque gerados por testes
-- DELETE FROM movimentacao_estoque WHERE organization_id = '89049aea-a737-4374-807c-d1f51dc63f64';

-- Remover vendas/pedidos (caso existam nessa instalação)
-- DELETE FROM vendas WHERE organization_id = '89049aea-a737-4374-807c-d1f51dc63f64';
-- DELETE FROM pedidos WHERE organization_id = '89049aea-a737-4374-807c-d1f51dc63f64';

-- Remover alertas gerados por testes
-- DELETE FROM alertas_fabrica WHERE organization_id = '89049aea-a737-4374-807c-d1f51dc63f64';

-- OBS: Por padrão não apagamos `estoque_produtos` nem `produtos_finais`.
-- Se você deseja limpar o estoque (atenção: isso altera saldos físicos!), descomente abaixo:
-- DELETE FROM estoque_produtos WHERE organization_id = '89049aea-a737-4374-807c-d1f51dc63f64' AND (metadata->>'test' = 'true' OR created_at < '2026-03-01');

COMMIT;

-- 4) Dicas de execução
-- - Execute as SELECTs de preview e confirme número de linhas.
-- - Faça backup do banco: veja exemplo abaixo.

-- EXEMPLO: backup com pg_dump (substitua valores):
-- pg_dump "postgresql://<DB_USER>:<DB_PASS>@<DB_HOST>:<DB_PORT>/<DB_NAME>" -Fc -f backup_org_89049aea.dump

-- FIM DO SCRIPT DE LIMPEZA (template específico para a organização acima)
