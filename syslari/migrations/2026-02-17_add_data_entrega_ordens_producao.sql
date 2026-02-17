-- 2026-02-17_add_data_entrega_ordens_producao.sql
-- Adiciona coluna `data_entrega` em `ordens_producao` quando ausente

ALTER TABLE IF EXISTS public.ordens_producao
  ADD COLUMN IF NOT EXISTS data_entrega timestamptz;

-- Use `data_entrega_prevista`/`data_previsao_entrega` conforme necessário na aplicação.
