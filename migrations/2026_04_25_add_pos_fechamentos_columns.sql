-- Migration: adiciona colunas de ajustes financeiros ao fechamento de PDV
BEGIN;

ALTER TABLE IF EXISTS public.pos_fechamentos
  ADD COLUMN IF NOT EXISTS valor_descontos_promocoes NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_combos NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observacoes_admin TEXT,
  ADD COLUMN IF NOT EXISTS valor_pix_conferencia NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_cartao_conferencia NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ajuste_global_promocoes NUMERIC DEFAULT 0;

-- Opcional: índices/constraints podem ser adicionados conforme necessidade

COMMIT;

-- OBS: Após aplicar essa migration, atualize o frontend do Admin para enviar
-- os campos `valor_pix_conferencia`, `valor_cartao_conferencia`, `ajuste_global_promocoes`
-- e `observacoes_admin` quando finalizar a conferência do caixa.
