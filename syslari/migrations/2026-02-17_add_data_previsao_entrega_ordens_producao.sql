-- 2026-02-17_add_data_previsao_entrega_ordens_producao.sql
-- Adiciona coluna de compatibilidade `data_previsao_entrega` em ordens_producao

ALTER TABLE IF EXISTS public.ordens_producao
  ADD COLUMN IF NOT EXISTS data_previsao_entrega timestamptz;

-- Opcional: copiar valores de outras colunas se fizer sentido
-- UPDATE public.ordens_producao SET data_previsao_entrega = data_entrega_prevista WHERE data_previsao_entrega IS NULL AND data_entrega_prevista IS NOT NULL;
