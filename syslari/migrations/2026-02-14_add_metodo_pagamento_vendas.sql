-- Migration: adicionar coluna metodo_pagamento em vendas
-- Autor: gerado automaticamente
-- Data: 2026-02-14

-- Observações:
-- 1) Adiciona a coluna `metodo_pagamento` como TEXT (nullable) para compatibilidade
-- 2) Cria um índice simples para consultas por método (opcional, melhora leitura)
-- 3) A alteração é compatível com bases existentes; caso queira valores restritos,
--    adicione uma CHECK constraint ou enum manualmente após verificação

BEGIN;

-- 1) Adiciona coluna (nullable para não quebrar inserts existentes)
ALTER TABLE public.vendas
ADD COLUMN IF NOT EXISTS metodo_pagamento text;

-- 2) Comentário para documentação
COMMENT ON COLUMN public.vendas.metodo_pagamento IS 'Método de pagamento utilizado no PDV: dinheiro | pix | cartao_credito (opcional)';

-- 3) Índice para filtro/agrupamento por método (opcional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_vendas_metodo_pagamento' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'CREATE INDEX idx_vendas_metodo_pagamento ON public.vendas(metodo_pagamento)';
  END IF;
END$$;

COMMIT;

-- Rollback (manualmente executável se necessário):
-- ALTER TABLE public.vendas DROP COLUMN IF EXISTS metodo_pagamento;
-- DROP INDEX IF EXISTS public.idx_vendas_metodo_pagamento;
