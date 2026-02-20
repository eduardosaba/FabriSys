-- Migration: add compatibility columns to movimentacao_estoque
-- Created: 2026-02-19
-- Idempotent: safe to run multiple times

BEGIN;

-- Adiciona coluna de referência (ex: id da OP, pedido, etc.)
ALTER TABLE IF EXISTS public.movimentacao_estoque
  ADD COLUMN IF NOT EXISTS referencia_id uuid;

-- Adiciona colunas de origem/destino em texto para compatibilidade com inserções antigas
ALTER TABLE IF EXISTS public.movimentacao_estoque
  ADD COLUMN IF NOT EXISTS origem text;

ALTER TABLE IF EXISTS public.movimentacao_estoque
  ADD COLUMN IF NOT EXISTS destino text;

-- Adiciona coluna `created_at` se ausente; backfill a partir de `data_movimento` quando possível
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='movimentacao_estoque' AND column_name='created_at'
  ) THEN
    ALTER TABLE public.movimentacao_estoque ADD COLUMN created_at timestamptz DEFAULT now();
    -- Se existir coluna data_movimento, use-a para backfill
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='data_movimento') THEN
      UPDATE public.movimentacao_estoque SET created_at = data_movimento WHERE created_at IS NULL AND data_movimento IS NOT NULL;
    END IF;
  END IF;
END$$;

-- Índice opcional na coluna referencia_id para buscas rápidas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_movimentacao_referencia_id' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_movimentacao_referencia_id ON public.movimentacao_estoque (referencia_id);
  END IF;
END$$;

COMMIT;

-- Observação: esta migration apenas garante compatibilidade do schema para os RPCs
-- existentes (ex.: `finalizar_op_kanban`, `finalizar_producao_intermediaria`).
