-- Migration to implement dual units system in insumos
-- Adds fields for unidade_estoque, custo_por_ue, unidade_consumo, fator_conversao

DO $$
DECLARE
  coluna_existe BOOLEAN;
BEGIN
  -- Check if unidade_estoque column already exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insumos' AND column_name = 'unidade_estoque'
  ) INTO coluna_existe;

  IF NOT coluna_existe THEN
    -- Add new columns for dual units system
    ALTER TABLE insumos ADD COLUMN unidade_estoque TEXT;
    ALTER TABLE insumos ADD COLUMN custo_por_ue DECIMAL(10,2);
    ALTER TABLE insumos ADD COLUMN unidade_consumo TEXT;
    ALTER TABLE insumos ADD COLUMN fator_conversao DECIMAL(10,3);

    -- Update existing records with default values
    -- unidade_medida becomes unidade_estoque (if exists)
    BEGIN
      UPDATE insumos SET unidade_estoque = unidade_medida WHERE unidade_estoque IS NULL;
    EXCEPTION
      WHEN undefined_column THEN
        -- If unidade_medida does not exist, use default value
        UPDATE insumos SET unidade_estoque = 'UN' WHERE unidade_estoque IS NULL;
    END;

    -- For insumos where UE = UC (ex: kg = kg), fator_conversao = 1
    UPDATE insumos SET
      unidade_consumo = unidade_estoque,
      fator_conversao = 1
    WHERE unidade_consumo IS NULL AND fator_conversao IS NULL;

    -- Add constraints
    ALTER TABLE insumos ADD CONSTRAINT check_unidade_estoque_not_empty
      CHECK (unidade_estoque IS NOT NULL AND unidade_estoque != '');

    ALTER TABLE insumos ADD CONSTRAINT check_fator_conversao_positive
      CHECK (fator_conversao > 0);

    -- Add column comments
    COMMENT ON COLUMN insumos.unidade_estoque IS 'Stock Unit (UE) - how the item is purchased and stored (ex: Can, KG, UN)';
    COMMENT ON COLUMN insumos.custo_por_ue IS 'Cost per Stock Unit (UE) - purchase price of 1 UE';
    COMMENT ON COLUMN insumos.unidade_consumo IS 'Consumption Unit (UC) - unit used in recipe (ex: g, ml)';
    COMMENT ON COLUMN insumos.fator_conversao IS 'Conversion Factor (FC) - amount of UC in 1 UE (ex: 395g per can)';

    RAISE NOTICE 'Migration completed: Dual units system added to insumos table';
  ELSE
    RAISE NOTICE 'Migration already applied: Columns already exist in insumos table';
  END IF;
END $$;