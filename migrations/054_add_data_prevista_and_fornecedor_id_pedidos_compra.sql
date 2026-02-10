-- Migration: 054_add_data_prevista_and_fornecedor_id_pedidos_compra.sql
-- Objetivo: adicionar colunas `fornecedor_id` e `data_prevista` em pedidos_compra
-- Executar em ambiente de desenvolvimento / staging primeiro e revisar antes de aplicar em produção.

-- 1) Adiciona colunas (transacional)
BEGIN;

ALTER TABLE public.pedidos_compra
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid;

ALTER TABLE public.pedidos_compra
  ADD COLUMN IF NOT EXISTS data_prevista date;

COMMIT;

-- 2) Índice: use o arquivo separado `055_create_index_pedidos_compra_fornecedor_id_concurrently.sql`
--    para executar o CREATE INDEX CONCURRENTLY fora de um bloco transacional.
--    Muitos runners (ex.: painel SQL do Supabase) executam todo o script dentro
--    de uma transação, o que causa o erro "CREATE INDEX CONCURRENTLY cannot run inside a transaction block".
--    Execute o arquivo 055 separadamente no editor SQL do Supabase (sem BEGIN/COMMIT).

-- 3) (Opcional) Backfill: se houver dados denormalizados com o nome do fornecedor, é possível tentar parear nomes
-- UPDATE public.pedidos_compra p
-- SET fornecedor_id = f.id
-- FROM public.fornecedores f
-- WHERE lower(trim(p.fornecedor)) = lower(trim(f.nome))
--   AND p.fornecedor_id IS NULL
--   AND p.fornecedor IS NOT NULL;

-- 4) (Opcional) Aplica FK apenas após validação/backfill
-- ALTER TABLE public.pedidos_compra
--   ADD CONSTRAINT fk_pedidos_compra_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;

-- Notas:
-- - Se você usa ferramentas de migração (flyway/liquibase), converta este arquivo para o formato adotado.
-- - Após aplicar a migração no banco, remova o fallback no cliente que detecta erro 42703, e rode os testes / build.
