-- Migration to implement 3-phase system in production orders
-- Adds fields for theoretical calculation, real production and loss/gain control

DO $$
DECLARE
  coluna_existe BOOLEAN;
BEGIN
  -- Check if columns already exist to avoid errors
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ordens_producao' AND column_name = 'quantidade_real_produzida'
  ) INTO coluna_existe;

  IF NOT coluna_existe THEN
    -- Add new columns for 3-phase system
    ALTER TABLE ordens_producao ADD COLUMN quantidade_real_produzida INTEGER;
    ALTER TABLE ordens_producao ADD COLUMN custo_real_unitario DECIMAL(10,4);
    ALTER TABLE ordens_producao ADD COLUMN custo_total_real DECIMAL(10,2);
    ALTER TABLE ordens_producao ADD COLUMN percentual_perda_ganho DECIMAL(5,2); -- Positive = gain, negative = loss
    ALTER TABLE ordens_producao ADD COLUMN insumos_teoricos JSONB; -- Store theoretical calculation of inputs
    ALTER TABLE ordens_producao ADD COLUMN insumos_reais JSONB; -- Store real consumption (if different from theoretical)
    ALTER TABLE ordens_producao ADD COLUMN observacoes_producao TEXT; -- Production-specific observations
    ALTER TABLE ordens_producao ADD COLUMN supervisor_producao UUID REFERENCES auth.users(id); -- Who supervised the production

    -- Add explanatory comments
    COMMENT ON COLUMN ordens_producao.quantidade_real_produzida IS 'Quantity actually produced (may be different from planned)';
    COMMENT ON COLUMN ordens_producao.custo_real_unitario IS 'Real unit cost calculated after production (R$/unit)';
    COMMENT ON COLUMN ordens_producao.custo_total_real IS 'Real total cost of consumed inputs';
    COMMENT ON COLUMN ordens_producao.percentual_perda_ganho IS 'Percentage of loss (-) or gain (+) in production';
    COMMENT ON COLUMN ordens_producao.insumos_teoricos IS 'Theoretical calculation of required inputs (in UC and converted to UE)';
    COMMENT ON COLUMN ordens_producao.insumos_reais IS 'Real consumption of inputs (if different from theoretical)';
    COMMENT ON COLUMN ordens_producao.observacoes_producao IS 'Production process specific observations';
    COMMENT ON COLUMN ordens_producao.supervisor_producao IS 'User who supervised/finalized the production';

    -- Create indexes for new columns
    CREATE INDEX IF NOT EXISTS ordens_producao_quantidade_real_idx ON ordens_producao(quantidade_real_produzida);
    CREATE INDEX IF NOT EXISTS ordens_producao_custo_real_idx ON ordens_producao(custo_real_unitario);

    RAISE NOTICE 'Migration completed: 3-phase system added to ordens_producao table';
  ELSE
    RAISE NOTICE 'Migration already applied: Columns already exist in ordens_producao table';
  END IF;
END $$;