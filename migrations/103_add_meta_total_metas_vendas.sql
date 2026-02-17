-- Migration: adicionar coluna meta_total em metas_vendas
-- Objetivo: armazenar o valor total mensal da meta junto com cada registro diário
BEGIN;

ALTER TABLE metas_vendas ADD COLUMN IF NOT EXISTS meta_total numeric(14,2);

-- Não inicializamos valores existentes automaticamente (pode ser calculado retroativamente se necessário)

COMMIT;
