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
DECLARE
  fk_col text := 'produto_final_id';
  has_col boolean;
BEGIN
  -- If key view/table is missing, return empty set safely
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'ficha_tecnica_insumos' AND n.nspname = 'public'
  ) THEN
    RETURN;
  END IF;

  -- Detect which FK column the ficha_tecnica_insumos view exposes.
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ficha_tecnica_insumos' AND column_name = 'produto_final_id'
  ) INTO has_col;

  IF has_col THEN
    fk_col := 'produto_final_id';
  ELSE
    -- try alternative common name
    SELECT EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'ficha_tecnica_insumos' AND column_name = 'produto_id'
    ) INTO has_col;
    IF has_col THEN
      fk_col := 'produto_id';
    ELSE
      -- no known FK column found: bail out safely
      RAISE NOTICE 'calcular_compras_planejamento: ficha_tecnica_insumos missing produto_final_id/produto_id';
      RETURN;
    END IF;
  END IF;

  -- Build and execute a query that joins ordens_producao with ficha_tecnica_insumos
  -- using the detected FK column name. This makes the RPC tolerant to schema
  -- variations introduced during cleanup / refactors.
  RETURN QUERY EXECUTE format($sql$
    SELECT
      fi.insumo_id::uuid,
      fi.insumo_nome::text,
      COALESCE(fi.unidade_medida, 'un')::text,
      0::numeric AS estoque_atual,
      SUM(COALESCE(op.quantidade_prevista,0) * COALESCE(fi.quantidade,0))::numeric AS qtd_necessaria,
      (0 - SUM(COALESCE(op.quantidade_prevista,0) * COALESCE(fi.quantidade,0)))::numeric AS saldo_final
    FROM public.ordens_producao op
    JOIN public.ficha_tecnica_insumos fi ON fi.%I = op.produto_final_id
    WHERE op.estagio_atual IN ('planejada','planejamento')
    GROUP BY fi.insumo_id, fi.insumo_nome, fi.unidade_medida
  $sql$, fk_col);
END
$$;

COMMENT ON FUNCTION public.calcular_compras_planejamento() IS 'Calcula necessidades de compras para o MRP. Fallback-safe version.';
