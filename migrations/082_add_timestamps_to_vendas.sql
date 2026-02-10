-- 082_add_timestamps_to_vendas.sql
-- Garante que a tabela `vendas` possua `created_at` e `updated_at` (útil para filtros por data)
BEGIN;

ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger para atualizar `updated_at` automaticamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_vendas_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION public.update_vendas_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trigger_update_vendas_timestamp ON public.vendas;
CREATE TRIGGER trigger_update_vendas_timestamp
  BEFORE UPDATE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vendas_updated_at();

-- Índice para acelerar consultas por data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'vendas' AND indexname = 'idx_vendas_created_at'
  ) THEN
    CREATE INDEX idx_vendas_created_at ON public.vendas(created_at);
  END IF;
END $$;

COMMIT;

-- Após aplicar, reinicie o serviço no Console do Supabase se necessário.
