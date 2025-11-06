-- Configuração da tabela de ordens de produção
-- Migrate up
DO $$
DECLARE
  tabela_existe BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ordens_producao'
  ) INTO tabela_existe;

  IF NOT tabela_existe THEN
    EXECUTE '
    CREATE TABLE ordens_producao (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      numero_op VARCHAR(50) UNIQUE NOT NULL,
      produto_final_id UUID NOT NULL REFERENCES produtos_finais(id),
      quantidade_prevista INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT ''pendente'',
      data_prevista DATE NOT NULL,
      data_inicio TIMESTAMPTZ,
      data_fim TIMESTAMPTZ,
      observacoes TEXT,
      prioridade INTEGER DEFAULT 1, -- 1: Normal, 2: Alta, 3: Urgente
      lote_producao VARCHAR(50), -- Identificador do lote
      created_by UUID REFERENCES auth.users(id),
      finalizado_por UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      versao_ficha_tecnica INTEGER, -- Versão da ficha técnica usada
      custo_previsto DECIMAL(10,2) -- CMP × quantidade_prevista
    );

    ALTER TABLE ordens_producao
      ADD CONSTRAINT status_check
      CHECK (status IN (''pendente'', ''em_producao'', ''pausada'', ''finalizada'', ''cancelada''));

    CREATE INDEX ordens_producao_status_idx ON ordens_producao(status);
    CREATE INDEX ordens_producao_data_prevista_idx ON ordens_producao(data_prevista);
    CREATE INDEX ordens_producao_produto_idx ON ordens_producao(produto_final_id);

    CREATE OR REPLACE FUNCTION generate_op_number()
    RETURNS TRIGGER AS $op_function$
    DECLARE
      ano_atual TEXT;
      sequencia INTEGER;
      novo_numero VARCHAR(50);
    BEGIN
      ano_atual := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

      SELECT COALESCE(MAX(CAST(SPLIT_PART(numero_op, ''/'', 1) AS INTEGER)), 0)
      INTO sequencia
      FROM ordens_producao
      WHERE numero_op LIKE ''%/'' || ano_atual;

      sequencia := sequencia + 1;

      novo_numero := LPAD(sequencia::TEXT, 4, ''0'') || ''/'' || ano_atual;

      NEW.numero_op := novo_numero;

      RETURN NEW;
    END;
    $op_function$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_generate_op_number
      BEFORE INSERT ON ordens_producao
      FOR EACH ROW
      EXECUTE FUNCTION generate_op_number();

    CREATE OR REPLACE FUNCTION update_ordens_producao_updated_at()
    RETURNS TRIGGER AS $update_function$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $update_function$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_ordens_producao_timestamp
      BEFORE UPDATE ON ordens_producao
      FOR EACH ROW
      EXECUTE FUNCTION update_ordens_producao_updated_at();

    ALTER TABLE ordens_producao ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Acesso total para admin"
      ON ordens_producao
      FOR ALL
      TO authenticated
      USING (auth.jwt() ->> ''role'' = ''admin'');

    CREATE POLICY "Fábrica pode gerenciar OPs"
      ON ordens_producao
      FOR ALL
      TO authenticated
      USING (auth.jwt() ->> ''role'' = ''fabrica'');

    CREATE OR REPLACE FUNCTION calculate_op_custo_previsto()
    RETURNS TRIGGER AS $custo_function$
    BEGIN
      SELECT
        COALESCE(p.cmp * NEW.quantidade_prevista, 0)
      INTO NEW.custo_previsto
      FROM produtos_finais p
      WHERE p.id = NEW.produto_final_id;

      SELECT MAX(versao)
      INTO NEW.versao_ficha_tecnica
      FROM ficha_tecnica
      WHERE produto_final_id = NEW.produto_final_id
        AND ativo = true;

      RETURN NEW;
    END;
    $custo_function$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_calculate_op_custo
      BEFORE INSERT ON ordens_producao
      FOR EACH ROW
      EXECUTE FUNCTION calculate_op_custo_previsto();

    COMMENT ON TABLE ordens_producao IS ''Ordens de produção para produtos finais'';
    ';
  END IF;
END $$;