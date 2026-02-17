-- 2026-02-17_add_preco_custo_produtos_finais.sql
-- Adiciona coluna `preco_custo` em `produtos_finais` e inicializa com 0 quando ausente

ALTER TABLE IF EXISTS public.produtos_finais
  ADD COLUMN IF NOT EXISTS preco_custo numeric(14,2);

UPDATE public.produtos_finais SET preco_custo = 0 WHERE preco_custo IS NULL;

-- Observação: alguns dashboards já fazem fallback quando coluna não existe; esta migration restaura compatibilidade completa.
