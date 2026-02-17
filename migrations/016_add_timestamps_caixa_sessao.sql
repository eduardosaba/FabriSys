-- Migration: 016_add_timestamps_caixa_sessao.sql
-- Adiciona colunas created_at e updated_at em caixa_sessao, com valores default e backfill

BEGIN;

ALTER TABLE IF EXISTS public.caixa_sessao
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.caixa_sessao
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Preenche linhas existentes se houver NULL
UPDATE public.caixa_sessao SET created_at = now() WHERE created_at IS NULL;
UPDATE public.caixa_sessao SET updated_at = now() WHERE updated_at IS NULL;

COMMIT;

-- Verificação sugerida:
-- SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'caixa_sessao';
