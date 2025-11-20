-- Migration to implement semi-finished products
-- Adds type to final products and allows products as inputs

DO $$
DECLARE
  coluna_existe BOOLEAN;
BEGIN
  -- Add type to final products
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'produtos_finais' AND column_name = 'tipo'
  ) INTO coluna_existe;

  IF NOT coluna_existe THEN
    ALTER TABLE produtos_finais ADD COLUMN tipo VARCHAR(20) DEFAULT 'final' CHECK (tipo IN ('final', 'semi_acabado'));

    COMMENT ON COLUMN produtos_finais.tipo IS 'Product type: final (sold) or semi_acabado (intermediate)';

    -- By default, existing products are final
    UPDATE produtos_finais SET tipo = 'final' WHERE tipo IS NULL;

    RAISE NOTICE 'Type field added to produtos_finais table';
  END IF;

  -- Add reference to final products in insumos table (virtual inputs)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insumos' AND column_name = 'produto_final_id'
  ) INTO coluna_existe;

  IF NOT coluna_existe THEN
    ALTER TABLE insumos ADD COLUMN produto_final_id UUID REFERENCES produtos_finais(id);

    COMMENT ON COLUMN insumos.produto_final_id IS 'If this input is a semi-finished product, reference to produto_final';

    -- Create index
    CREATE INDEX IF NOT EXISTS insumos_produto_final_idx ON insumos(produto_final_id);

    RAISE NOTICE 'produto_final_id field added to insumos table';
  END IF;

  -- Add field to control if it is physical or virtual input
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insumos' AND column_name = 'tipo_insumo'
  ) INTO coluna_existe;

  IF NOT coluna_existe THEN
    ALTER TABLE insumos ADD COLUMN tipo_insumo VARCHAR(10) DEFAULT 'fisico' CHECK (tipo_insumo IN ('fisico', 'virtual'));

    COMMENT ON COLUMN insumos.tipo_insumo IS 'Input type: fisico (raw material) or virtual (semi-finished product)';

    -- By default, existing inputs are physical
    UPDATE insumos SET tipo_insumo = 'fisico' WHERE tipo_insumo IS NULL;

    RAISE NOTICE 'tipo_insumo field added to insumos table';
  END IF;

END $$;