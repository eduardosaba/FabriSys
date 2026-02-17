-- Migration: Add `diferenca` column to caixa_diario
-- Reason: closing caixa update attempted to write `diferenca`, but table lacked the column
BEGIN;

ALTER TABLE IF EXISTS public.caixa_diario
ADD COLUMN IF NOT EXISTS diferenca numeric;

-- Backfill zero for existing rows (safe no-op if column already default null)
UPDATE public.caixa_diario SET diferenca = 0 WHERE diferenca IS NULL;

COMMIT;

-- NOTE: apply this migration in staging/production (psql or via migration runner)