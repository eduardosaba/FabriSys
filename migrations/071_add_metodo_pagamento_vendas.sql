-- 071_add_metodo_pagamento_vendas.sql
-- Migration: adiciona a coluna metodo_pagamento na tabela `vendas`
-- Executar no Supabase SQL Editor ou via psql na base de produção/preview.

BEGIN;

-- Adiciona a coluna apenas se não existir (seguro para re-runs)
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT;

COMMIT;

-- OBS:
-- 1) Após aplicar, caso o PostgREST (Supabase) ainda retorne PGRST204, reinicie o serviço
--    no Console do Supabase: Settings -> Database -> Restart. Isso força o refresh do schema cache.
-- 2) Se desejar um valor padrão para linhas antigas, execute um UPDATE adicional após avaliar o impacto.
