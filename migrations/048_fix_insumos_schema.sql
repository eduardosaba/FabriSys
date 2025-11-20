-- Migration: Fix insumos table schema to match TypeScript types
-- Date: 2025-11-15
-- Description: Updates categoria_id to UUID and ensures all required fields are present

DO $$
DECLARE
    categoria_exists BOOLEAN;
    atributos_exists BOOLEAN;
    unidade_estoque_exists BOOLEAN;
    custo_por_ue_exists BOOLEAN;
    unidade_consumo_exists BOOLEAN;
    fator_conversao_exists BOOLEAN;
    produto_final_id_exists BOOLEAN;
    tipo_insumo_exists BOOLEAN;
BEGIN
    -- Check existing columns
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insumos' AND column_name = 'categoria_id') INTO categoria_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insumos' AND column_name = 'atributos_dinamicos') INTO atributos_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insumos' AND column_name = 'unidade_estoque') INTO unidade_estoque_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insumos' AND column_name = 'custo_por_ue') INTO custo_por_ue_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insumos' AND column_name = 'unidade_consumo') INTO unidade_consumo_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insumos' AND column_name = 'fator_conversao') INTO fator_conversao_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insumos' AND column_name = 'produto_final_id') INTO produto_final_id_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insumos' AND column_name = 'tipo_insumo') INTO tipo_insumo_exists;

    -- Fix categoria_id: ensure it's UUID type
    IF categoria_exists THEN
        -- Check if it's not already UUID
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'insumos'
            AND column_name = 'categoria_id'
            AND data_type = 'uuid'
        ) THEN
            -- If it's BIGINT or other type, we need to handle conversion carefully
            -- For safety, we'll drop and recreate the column as UUID
            -- This will set existing categoria_id values to NULL
            ALTER TABLE insumos DROP COLUMN categoria_id;
            ALTER TABLE insumos ADD COLUMN categoria_id UUID REFERENCES categorias(id);
            CREATE INDEX idx_insumos_categoria_id ON insumos(categoria_id);

            RAISE NOTICE 'categoria_id recreated as UUID (existing data set to NULL)';
        ELSE
            RAISE NOTICE 'categoria_id already UUID, no changes needed';
        END IF;
    ELSE
        -- Add categoria_id column if it doesn't exist
        ALTER TABLE insumos ADD COLUMN categoria_id UUID REFERENCES categorias(id);
        CREATE INDEX idx_insumos_categoria_id ON insumos(categoria_id);
        RAISE NOTICE 'categoria_id column added';
    END IF;

    -- Add atributos_dinamicos if not exists
    IF NOT atributos_exists THEN
        ALTER TABLE insumos ADD COLUMN atributos_dinamicos JSONB DEFAULT '{}'::jsonb;
        COMMENT ON COLUMN insumos.atributos_dinamicos IS 'Dynamic attributes for custom insumo properties';
        RAISE NOTICE 'atributos_dinamicos column added';
    END IF;

    -- Add unidade_estoque if not exists
    IF NOT unidade_estoque_exists THEN
        ALTER TABLE insumos ADD COLUMN unidade_estoque TEXT;
        COMMENT ON COLUMN insumos.unidade_estoque IS 'Stock Unit (UE) - how the item is purchased and stored (ex: Can, KG, UN)';
        RAISE NOTICE 'unidade_estoque column added';
    END IF;

    -- Add custo_por_ue if not exists
    IF NOT custo_por_ue_exists THEN
        ALTER TABLE insumos ADD COLUMN custo_por_ue DECIMAL(10,2);
        COMMENT ON COLUMN insumos.custo_por_ue IS 'Cost per Stock Unit (UE) - purchase price of 1 UE';
        RAISE NOTICE 'custo_por_ue column added';
    END IF;

    -- Add unidade_consumo if not exists
    IF NOT unidade_consumo_exists THEN
        ALTER TABLE insumos ADD COLUMN unidade_consumo TEXT;
        COMMENT ON COLUMN insumos.unidade_consumo IS 'Consumption Unit (UC) - unit used in recipe (ex: g, ml)';
        RAISE NOTICE 'unidade_consumo column added';
    END IF;

    -- Add fator_conversao if not exists
    IF NOT fator_conversao_exists THEN
        ALTER TABLE insumos ADD COLUMN fator_conversao DECIMAL(10,3);
        COMMENT ON COLUMN insumos.fator_conversao IS 'Conversion Factor (FC) - amount of UC in 1 UE (ex: 395g per can)';
        RAISE NOTICE 'fator_conversao column added';
    END IF;

    -- Add produto_final_id if not exists (for semi-finished products)
    IF NOT produto_final_id_exists THEN
        ALTER TABLE insumos ADD COLUMN produto_final_id UUID REFERENCES produtos_finais(id);
        COMMENT ON COLUMN insumos.produto_final_id IS 'Reference to semi-finished product if this insumo is a semi-finished item';
        RAISE NOTICE 'produto_final_id column added';
    END IF;

    -- Add tipo_insumo if not exists
    IF NOT tipo_insumo_exists THEN
        ALTER TABLE insumos ADD COLUMN tipo_insumo VARCHAR(10) DEFAULT 'fisico' CHECK (tipo_insumo IN ('fisico', 'virtual'));
        COMMENT ON COLUMN insumos.tipo_insumo IS 'Type of insumo: fisico (physical) or virtual (semi-finished product)';
        RAISE NOTICE 'tipo_insumo column added';
    END IF;

    -- Set default values for existing records where needed
    UPDATE insumos SET
        atributos_dinamicos = '{}'::jsonb
    WHERE atributos_dinamicos IS NULL;

    UPDATE insumos SET
        unidade_estoque = unidade_medida
    WHERE unidade_estoque IS NULL AND unidade_medida IS NOT NULL;

    UPDATE insumos SET
        unidade_consumo = unidade_estoque,
        fator_conversao = 1
    WHERE unidade_consumo IS NULL AND fator_conversao IS NULL AND unidade_estoque IS NOT NULL;

    -- Add constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'insumos' AND constraint_name = 'check_unidade_estoque_not_empty') THEN
        ALTER TABLE insumos ADD CONSTRAINT check_unidade_estoque_not_empty
            CHECK (unidade_estoque IS NOT NULL AND unidade_estoque != '');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'insumos' AND constraint_name = 'check_fator_conversao_positive') THEN
        ALTER TABLE insumos ADD CONSTRAINT check_fator_conversao_positive
            CHECK (fator_conversao > 0);
    END IF;

    RAISE NOTICE 'Migration completed: insumos table schema updated to match TypeScript types';

END $$;