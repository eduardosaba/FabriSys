-- Migration: adicionar coluna dias_funcionamento em locais
-- Objetivo: persistir dias de funcionamento (0=Dom..6=Sab) por PDV
BEGIN;

ALTER TABLE locais ADD COLUMN IF NOT EXISTS dias_funcionamento smallint[];

-- Inicializar registros existentes com todos os dias selecionados caso nulo
UPDATE locais
SET dias_funcionamento = ARRAY[0,1,2,3,4,5,6]
WHERE dias_funcionamento IS NULL;

COMMIT;
