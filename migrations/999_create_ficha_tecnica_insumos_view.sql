-- Migration 999: Create alias view `ficha_tecnica_insumos` if missing
-- Purpose: some legacy functions / RPCs expect a view named ficha_tecnica_insumos.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'ficha_tecnica_insumos' AND n.nspname = 'public'
  ) THEN
    -- Prefer the consolidated view if available
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'v_fichas_tecnicas_completas' AND n.nspname = 'public') THEN
      EXECUTE 'CREATE OR REPLACE VIEW public.ficha_tecnica_insumos AS SELECT * FROM public.v_fichas_tecnicas_completas';
    ELSIF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'fichas_tecnicas' AND n.nspname = 'public') THEN
      -- Build a minimal view from fichas_tecnicas + insumos
      EXECUTE $sql$
        CREATE OR REPLACE VIEW public.ficha_tecnica_insumos AS
        SELECT
          ft.id as ficha_id,
          ft.produto_final_id,
          pf.nome as produto_nome,
          ft.insumo_id,
          i.nome as insumo_nome,
          i.custo_unitario,
          ft.quantidade,
          ft.unidade_medida,
          ft.perda_padrao
        FROM public.fichas_tecnicas ft
        LEFT JOIN public.insumos i ON i.id = ft.insumo_id
        LEFT JOIN public.produtos_finais pf ON pf.id = ft.produto_final_id
        WHERE ft.ativo = true;
      $sql$;
    ELSE
      -- No source available; create an empty view to avoid runtime errors
      EXECUTE 'CREATE OR REPLACE VIEW public.ficha_tecnica_insumos AS SELECT NULL::uuid as ficha_id LIMIT 0';
    END IF;
    RAISE NOTICE 'View ficha_tecnica_insumos ensured (created if missing)';
  ELSE
    RAISE NOTICE 'View ficha_tecnica_insumos already exists';
  END IF;
END $$;
