-- Migration 999: Add FK on pedidos_compra.fornecedor_id -> fornecedores.id with ON DELETE SET NULL
DO $$
BEGIN
  -- Ensure column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos_compra' AND column_name='fornecedor_id') THEN
    -- Add FK constraint if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'pedidos_compra' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'fornecedor_id'
    ) THEN
      ALTER TABLE public.pedidos_compra
      ADD CONSTRAINT pedidos_compra_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;
      RAISE NOTICE 'FK pedidos_compra.fornecedor_id -> fornecedores(id) created with ON DELETE SET NULL';
    ELSE
      RAISE NOTICE 'FK on pedidos_compra.fornecedor_id already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column pedidos_compra.fornecedor_id not found; skipping FK creation';
  END IF;

  -- Example: adjust RLS policy to allow selects for authenticated role
  -- (Adapt to your security model before applying in production)
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'pedidos_compra' AND n.nspname = 'public') THEN
    -- Create a permissive select policy for demonstration if it does not exist.
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE policyname = 'allow_select_for_authenticated' AND tablename = 'pedidos_compra'
    ) THEN
      EXECUTE 'CREATE POLICY allow_select_for_authenticated ON public.pedidos_compra FOR SELECT TO authenticated USING (true)';
    END IF;
  END IF;
END $$;
