-- Adiciona campo custo_unitario na tabela insumos
-- Migration: 033_add_custo_unitario_insumos

DO $$
BEGIN
  -- Verifica se a coluna já existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'insumos' 
    AND column_name = 'custo_unitario'
  ) THEN
    -- Adiciona a coluna custo_unitario
    ALTER TABLE insumos 
    ADD COLUMN custo_unitario DECIMAL(10,2) DEFAULT 0 NOT NULL;

    -- Adiciona comentário na coluna
    COMMENT ON COLUMN insumos.custo_unitario IS 'Custo unitário atual do insumo para cálculos de ficha técnica';
  END IF;
END $$;
