-- Migration: adicionar coluna status em vendas
-- Autor: gerado automaticamente
-- Data: 2026-02-14

-- Observações:
-- 1) Adiciona a coluna `status` como TEXT (nullable) para compatibilidade
-- 2) Cria um índice simples para consultas por status (opcional)

BEGIN;

-- 1) Adiciona coluna (nullable para não quebrar inserts existentes)
ALTER TABLE public.vendas
ADD COLUMN IF NOT EXISTS status text;

-- 2) Comentário para documentação
COMMENT ON COLUMN public.vendas.status IS 'Status da venda (ex: pendente | concluida | cancelada)';

-- 3) Índice para filtro/agrupamento por status (opcional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_vendas_status' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'CREATE INDEX idx_vendas_status ON public.vendas(status)';
  END IF;
END$$;

COMMIT;

-- Rollback (manualmente executável se necessário):
-- ALTER TABLE public.vendas DROP COLUMN IF EXISTS status;
-- DROP INDEX IF EXISTS public.idx_vendas_status;
