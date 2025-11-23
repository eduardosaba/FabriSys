-- Migration: 055_add_unidade_estoque_backfill.sql
-- Objetivo: garantir que a coluna `unidade_estoque` exista, seja não-vazia
-- e compatibilizar dados existentes com `unidade_medida`.
-- Rodar no Supabase SQL Editor (ou via psql) em um ambiente de staging antes de produção.

BEGIN;

-- 1) Criar coluna se não existir
ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS unidade_estoque text;

-- 2) Backfill: preenche vazio/nulo com unidade_medida quando possível, senão 'UN'
UPDATE public.insumos
SET unidade_estoque = COALESCE(NULLIF(TRIM(unidade_estoque), ''), NULLIF(TRIM(unidade_medida), ''), 'UN')
WHERE COALESCE(TRIM(unidade_estoque), '') = '';

-- 3) Garantir valor default para novas linhas
ALTER TABLE public.insumos
  ALTER COLUMN unidade_estoque SET DEFAULT 'UN';

-- 4) (Re)criar constraint que exige valor não-vazio.
--    Se já existir com esse nome, removemos antes para evitar erro.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'check_unidade_estoque_not_empty' AND t.relname = 'insumos'
  ) THEN
    ALTER TABLE public.insumos DROP CONSTRAINT check_unidade_estoque_not_empty;
  END IF;
END$$;

ALTER TABLE public.insumos
  ADD CONSTRAINT check_unidade_estoque_not_empty CHECK (char_length(trim(coalesce(unidade_estoque, ''))) > 0);

COMMIT;

-- ROLLBACK (para uso manual, se necessário):
-- BEGIN; 
-- ALTER TABLE public.insumos DROP CONSTRAINT IF EXISTS check_unidade_estoque_not_empty; 
-- ALTER TABLE public.insumos ALTER COLUMN unidade_estoque DROP DEFAULT; 
-- -- opcional: remover coluna (verifique dependências antes):
-- -- ALTER TABLE public.insumos DROP COLUMN IF EXISTS unidade_estoque;
-- COMMIT;
