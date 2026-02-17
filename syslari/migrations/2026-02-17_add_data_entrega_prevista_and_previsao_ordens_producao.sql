-- 2026-02-17_add_data_entrega_prevista_and_previsao_ordens_producao.sql
-- Adiciona colunas de compatibilidade de datas em ordens_producao

ALTER TABLE IF EXISTS public.ordens_producao
  ADD COLUMN IF NOT EXISTS data_entrega_prevista timestamptz;

ALTER TABLE IF EXISTS public.ordens_producao
  ADD COLUMN IF NOT EXISTS data_previsao_entrega timestamptz;

-- Não preenchemos automaticamente; a aplicação ou processos de backfill podem popular se necessário.
