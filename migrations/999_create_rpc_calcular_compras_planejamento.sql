-- Migration 999: Create RPC calcular_compras_planejamento with safe fallback
-- This function returns the expected columns. If required tables/views are missing
-- it returns an empty set instead of throwing, to avoid 404/500 runtime errors.
CREATE OR REPLACE FUNCTION public.calcular_compras_planejamento()
RETURNS TABLE(
  insumo_id uuid,
  nome_insumo text,
  unidade text,
  estoque_atual numeric,
  qtd_necessaria numeric,
  saldo_final numeric
) LANGUAGE plpgsql AS $$
BEGIN
  -- If key objects are missing, return empty set safely
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'ficha_tecnica_insumos' AND n.nspname = 'public') THEN
    RETURN;
  END IF;

  -- Simplified calculation: aggregate required quantity from ordens_producao (planejada)
  -- and multiply by ficha_tecnica quantidade. This is a best-effort fallback.
  RETURN QUERY
  SELECT
    fi.insumo_id::uuid,
    fi.insumo_nome::text,
    COALESCE(fi.unidade_medida, 'un')::text,
    0::numeric AS estoque_atual, -- stock calculation requires historico_estoque view; left as 0 in fallback
    SUM(COALESCE(op.quantidade_prevista,0) * COALESCE(fi.quantidade,0))::numeric AS qtd_necessaria,
    (0 - SUM(COALESCE(op.quantidade_prevista,0) * COALESCE(fi.quantidade,0)))::numeric AS saldo_final
  FROM public.ordens_producao op
  JOIN public.ficha_tecnica_insumos fi ON fi.produto_final_id = op.produto_final_id
  WHERE op.estagio_atual IN ('planejada','planejamento')
  GROUP BY fi.insumo_id, fi.insumo_nome, fi.unidade_medida;
END
$$;

COMMENT ON FUNCTION public.calcular_compras_planejamento() IS 'Calcula necessidades de compras para o MRP. Fallback-safe version.';
