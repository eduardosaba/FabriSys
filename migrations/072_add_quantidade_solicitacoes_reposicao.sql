-- 072_add_quantidade_solicitacoes_reposicao.sql
-- Adiciona coluna `quantidade` em `solicitacoes_reposicao`.
-- Execute no Supabase SQL Editor ou via psql.

BEGIN;

-- Cria a coluna caso não exista
ALTER TABLE public.solicitacoes_reposicao
  ADD COLUMN IF NOT EXISTS quantidade INTEGER;

COMMIT;

-- Opcional: backfill simples a partir do campo `observacao` se o padrão "Quantidade solicitada: N" foi usado.
-- ATENÇÃO: revisar antes de executar em produção.
--
-- UPDATE public.solicitacoes_reposicao
-- SET quantidade = (regexp_matches(observacao, 'Quantidade solicitada:\s*(\d+)', 'i'))[1]::int
-- WHERE observacao IS NOT NULL AND quantidade IS NULL;

-- Após aplicar, reinicie o Database no Console do Supabase (Settings -> Database -> Restart)
-- para garantir que o PostgREST/Realtime atualize o schema cache.
