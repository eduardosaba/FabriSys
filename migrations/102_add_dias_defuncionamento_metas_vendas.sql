-- Migration: adicionar coluna dias_defuncionamento em metas_vendas
-- Objetivo: armazenar a quantidade de dias de funcionamento usados para distribuir a meta mensal
BEGIN;

ALTER TABLE metas_vendas ADD COLUMN IF NOT EXISTS dias_defuncionamento integer;

-- Não inicializamos valores existentes automaticamente (pode ser calculado retroativamente se necessário)

COMMIT;
