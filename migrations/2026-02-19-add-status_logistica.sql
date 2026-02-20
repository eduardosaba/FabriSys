-- Migration: add status_logistica column to ordens_producao
-- Created: 2026-02-19
-- Idempotent: safe to run multiple times

BEGIN;

-- Adiciona coluna textual para controlar status logístico/expedição
ALTER TABLE IF EXISTS public.ordens_producao
  ADD COLUMN IF NOT EXISTS status_logistica text DEFAULT 'pendente';

-- Índice para consultas por status (opcional, melhora filtros)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_ordens_producao_status_logistica' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_ordens_producao_status_logistica ON public.ordens_producao (status_logistica);
  END IF;
END$$;

COMMIT;

-- Observações:
-- 1) Execute esta migration contra seu banco Supabase (às vezes via psql ou supabase CLI).
-- 2) Se você preferir não adicionar a coluna, mantenha a lógica no cliente que evita PATCHs quando a coluna
--    não existe (já aplicada no código). Alternativamente, crie uma RPC que atualize essa coluna de forma segura.
