-- 2026-02-17_add_forma_pagamento_vendas.sql
-- Adiciona coluna `forma_pagamento` em `vendas` quando ausente

ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS forma_pagamento text;

-- Não define default — deixe a aplicação popular o valor quando disponível.
