-- Test script for create_remessa RPC
-- Inserts a test OP, calls the RPC and shows resulting rows.
-- Runs inside a transaction and rolls back at the end.


BEGIN;

-- Garantir colunas de compatibilidade
ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS estoque_seguranca INTEGER DEFAULT 0;
ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS quantidade_enviada_extra INTEGER DEFAULT 0;

-- 1) Garantir existência de um produto (cria um se não existir) e inserir OP referenciando-o
WITH new_prod AS (
  INSERT INTO produtos_finais (nome, created_at)
  SELECT 'test-prod-remessa', now()
  WHERE NOT EXISTS (SELECT 1 FROM produtos_finais)
  RETURNING id
), prod AS (
  SELECT id FROM produtos_finais
  UNION ALL
  SELECT id FROM new_prod
), ins AS (
  INSERT INTO ordens_producao (produto_final_id, quantidade_prevista, data_prevista, estoque_seguranca, quantidade_enviada_extra, status_logistica, created_at)
  SELECT id, 100, now(), 20, 0, 'pendente', now() FROM prod LIMIT 1
  RETURNING id
)
-- 2) Call the RPC to create remessa and send 10 units of extra using the inserted id
SELECT public.create_remessa(
  1,
  (
    SELECT jsonb_agg(jsonb_build_object('op_id', id::text, 'produto_id', (SELECT id::text FROM prod LIMIT 1), 'quantidade_pedido', 100, 'extra', 10))
    FROM ins
  ),
  NULL
 ) AS remessa_id;

-- 3) Inspect remessas and remessas_itens (last inserted)
SELECT id, loja_id, created_by, status, created_at FROM remessas ORDER BY created_at DESC LIMIT 5;
SELECT id, remessa_id, op_id, produto_id, quantidade_pedido, quantidade_extra FROM remessas_itens ORDER BY id DESC LIMIT 5;

-- 4) Verify op updated (use id from ins)
SELECT id, estoque_seguranca, quantidade_enviada_extra FROM ordens_producao ORDER BY created_at DESC LIMIT 1;

-- Cleanup: rollback to leave DB unchanged
ROLLBACK;

-- Notes:
-- - Run this script against a staging database.
-- - If your ordens_producao requires more columns at insert time, adapt the INSERT accordingly.
-- - Use psql or your DB tool to run and inspect the output:
--   psql "host=... user=... dbname=..." -f migrations/2026_04_24_test_create_remessa.sql
