-- Migration de backfill: popular `meta_total` e `dias_defuncionamento` em `metas_vendas`
-- Instruções: cole e execute no editor SQL do Supabase (ou rode via psql).

BEGIN;

-- 1) Calcular e popular meta_total por loja e mês
WITH monthly_totals AS (
  SELECT
    local_id,
    date_trunc('month', data_referencia)::date AS month_start,
    SUM(COALESCE(valor_meta, 0))::numeric(14,2) AS total
  FROM metas_vendas
  GROUP BY local_id, month_start
)
UPDATE metas_vendas mv
SET meta_total = mt.total
FROM monthly_totals mt
WHERE mv.local_id = mt.local_id
  AND date_trunc('month', mv.data_referencia)::date = mt.month_start;

-- 2) Popular dias_defuncionamento preferindo valor em `locais.dias_funcionamento` quando presente
UPDATE metas_vendas mv
SET dias_defuncionamento = COALESCE(
  (SELECT cardinality(l.dias_funcionamento) FROM locais l WHERE l.id = mv.local_id AND l.dias_funcionamento IS NOT NULL),
  (SELECT COUNT(*) FROM metas_vendas mv2 WHERE mv2.local_id = mv.local_id AND date_trunc('month', mv2.data_referencia) = date_trunc('month', mv.data_referencia) AND COALESCE(mv2.valor_meta,0) <> 0)
)::integer
WHERE mv.dias_defuncionamento IS NULL;

COMMIT;

-- Observações:
-- - O primeiro UPDATE atualiza todas as linhas de um mês com o mesmo meta_total calculado.
-- - O segundo UPDATE tenta usar o tamanho do array `locais.dias_funcionamento`; se não existir, conta dias com `valor_meta <> 0`.
-- - Verifique permissões/RLS se receber erro de permissão ao rodar no Supabase.
