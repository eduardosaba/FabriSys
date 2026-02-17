-- Migration: Adicionar coluna observacoes em caixa_diario (evita erro 400 ao fechar caixa)
-- Data: 2026-02-14

ALTER TABLE public.caixa_diario
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Backfill vazio opcional (não sobrescreve valores existentes)
UPDATE public.caixa_diario SET observacoes = '' WHERE observacoes IS NULL;
