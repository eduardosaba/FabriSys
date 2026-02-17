-- 103_fix_distribuicao_locais.sql
-- Garante colunas local_origem_id e local_destino_id em distribucao_pedidos

BEGIN;

ALTER TABLE IF EXISTS public.distribuicao_pedidos
  ADD COLUMN IF NOT EXISTS local_origem_id uuid;

ALTER TABLE IF EXISTS public.distribuicao_pedidos
  ADD COLUMN IF NOT EXISTS local_destino_id uuid;

-- Tenta backfill a partir de possíveis nomes alternativos
DO $$
BEGIN
  -- origem
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='origem_id') THEN
    UPDATE public.distribuicao_pedidos SET local_origem_id = origem_id WHERE local_origem_id IS NULL AND origem_id IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='origem') THEN
    UPDATE public.distribuicao_pedidos SET local_origem_id = origem WHERE local_origem_id IS NULL AND origem IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='local_origin_id') THEN
    UPDATE public.distribuicao_pedidos SET local_origem_id = local_origin_id WHERE local_origem_id IS NULL AND local_origin_id IS NOT NULL;
  END IF;

  -- destino
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='destino_id') THEN
    UPDATE public.distribuicao_pedidos SET local_destino_id = destino_id WHERE local_destino_id IS NULL AND destino_id IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='destino') THEN
    UPDATE public.distribuicao_pedidos SET local_destino_id = destino WHERE local_destino_id IS NULL AND destino IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='local_destination_id') THEN
    UPDATE public.distribuicao_pedidos SET local_destino_id = local_destination_id WHERE local_destino_id IS NULL AND local_destination_id IS NOT NULL;
  END IF;
END;
$$;

COMMIT;
