-- Configuração da tabela de fichas técnicas (receitas)
-- Migrate up
DO $$
DECLARE
  tabela_existe BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ficha_tecnica'
  ) INTO tabela_existe;

  IF NOT tabela_existe THEN
    EXECUTE '
    CREATE TABLE ficha_tecnica (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      produto_final_id UUID NOT NULL REFERENCES produtos_finais(id) ON DELETE CASCADE,
      insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
      quantidade DECIMAL(10,3) NOT NULL, -- Quantidade por unidade
      unidade_medida VARCHAR(50) NOT NULL,
      perda_padrao DECIMAL(5,2) DEFAULT 0, -- Percentual de perda esperado
      rendimento_unidades INTEGER NOT NULL DEFAULT 1, -- Quantas unidades a receita produz
      instrucoes TEXT, -- Instruções de preparo
      tempo_preparo_minutos INTEGER,
      ordem_producao INTEGER, -- Ordem dos passos na receita
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id),
      versao INTEGER DEFAULT 1, -- Controle de versão da receita
      ativo BOOLEAN DEFAULT true -- Permite desativar itens da receita
    );

    CREATE INDEX ficha_tecnica_produto_idx ON ficha_tecnica(produto_final_id);
    CREATE INDEX ficha_tecnica_insumo_idx ON ficha_tecnica(insumo_id);

    CREATE OR REPLACE FUNCTION update_ficha_tecnica_updated_at()
    RETURNS TRIGGER AS $function$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_ficha_tecnica_timestamp
      BEFORE UPDATE ON ficha_tecnica
      FOR EACH ROW
      EXECUTE FUNCTION update_ficha_tecnica_updated_at();

    ALTER TABLE ficha_tecnica ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Acesso total para admin"
      ON ficha_tecnica
      FOR ALL
      TO authenticated
      USING (auth.jwt() ->> ''role'' = ''admin'');

    CREATE POLICY "Fábrica pode visualizar fichas técnicas"
      ON ficha_tecnica
      FOR SELECT
      TO authenticated
      USING (auth.jwt() ->> ''role'' IN (''admin'', ''fabrica''));

    CREATE OR REPLACE FUNCTION update_produto_final_cmp()
    RETURNS TRIGGER AS $cmp_function$
    DECLARE
      v_cmp DECIMAL(10,2);
    BEGIN
      SELECT
        COALESCE(SUM(
          (ft.quantidade * i.valor_unitario) *
          (1 + COALESCE(ft.perda_padrao, 0)/100.0) /
          GREATEST(ft.rendimento_unidades, 1)
        ), 0)
      INTO v_cmp
      FROM ficha_tecnica ft
      JOIN insumos i ON i.id = ft.insumo_id
      WHERE ft.produto_final_id = NEW.produto_final_id
        AND ft.ativo = true;

      UPDATE produtos_finais
      SET cmp = v_cmp,
          updated_at = NOW()
      WHERE id = NEW.produto_final_id;

      RETURN NEW;
    END;
    $cmp_function$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_cmp
      AFTER INSERT OR UPDATE OR DELETE ON ficha_tecnica
      FOR EACH ROW
      EXECUTE FUNCTION update_produto_final_cmp();

    COMMENT ON TABLE ficha_tecnica IS ''Receitas e composição dos produtos finais'';
    ';
  END IF;
END $$;