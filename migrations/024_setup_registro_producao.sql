-- Configuração da tabela de registro de produção real
-- Migrate up
DO $$
DECLARE
  tabela_existe BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'registro_producao_real'
  ) INTO tabela_existe;

  IF NOT tabela_existe THEN
    EXECUTE '
    CREATE TABLE registro_producao_real (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      ordem_producao_id UUID NOT NULL REFERENCES ordens_producao(id),
      quantidade_produzida INTEGER NOT NULL,
      quantidade_perda INTEGER DEFAULT 0,
      motivo_perda TEXT,
      data_producao TIMESTAMPTZ NOT NULL,
      temperatura_ambiente DECIMAL(5,2), -- Controle de temperatura
      umidade_relativa DECIMAL(5,2), -- Controle de umidade
      tempo_producao_minutos INTEGER, -- Tempo real de produção
      observacoes_processo TEXT,
      controle_qualidade JSONB, -- Critérios de qualidade verificados
      created_by UUID REFERENCES auth.users(id),
      supervisor_id UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX registro_producao_ordem_idx ON registro_producao_real(ordem_producao_id);
    CREATE INDEX registro_producao_data_idx ON registro_producao_real(data_producao);

    CREATE OR REPLACE FUNCTION update_registro_producao_updated_at()
    RETURNS TRIGGER AS $update_function$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $update_function$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_registro_producao_timestamp
      BEFORE UPDATE ON registro_producao_real
      FOR EACH ROW
      EXECUTE FUNCTION update_registro_producao_updated_at();

    ALTER TABLE registro_producao_real ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Acesso total para admin"
      ON registro_producao_real
      FOR ALL
      TO authenticated
      USING (auth.jwt() ->> ''role'' = ''admin'');

    CREATE POLICY "Fábrica pode gerenciar registros"
      ON registro_producao_real
      FOR ALL
      TO authenticated
      USING (auth.jwt() ->> ''role'' = ''fabrica'');

    CREATE OR REPLACE FUNCTION finalizar_ordem_producao()
    RETURNS TRIGGER AS $finalizar_function$
    DECLARE
      v_total_produzido INTEGER;
      v_total_perdas INTEGER;
      v_eficiencia DECIMAL(5,2);
      v_ordem_producao ordens_producao%ROWTYPE;
    BEGIN
      SELECT * INTO v_ordem_producao
      FROM ordens_producao
      WHERE id = NEW.ordem_producao_id;

      SELECT
        COALESCE(SUM(quantidade_produzida), 0),
        COALESCE(SUM(quantidade_perda), 0)
      INTO v_total_produzido, v_total_perdas
      FROM registro_producao_real
      WHERE ordem_producao_id = NEW.ordem_producao_id;

      v_eficiencia := (v_total_produzido::DECIMAL / NULLIF(v_ordem_producao.quantidade_prevista, 0)) * 100;

      IF v_total_produzido >= v_ordem_producao.quantidade_prevista THEN
        UPDATE ordens_producao
        SET status = ''finalizada'',
            data_fim = NOW(),
            finalizado_por = NEW.created_by
        WHERE id = NEW.ordem_producao_id;
      END IF;

      INSERT INTO movimentacao_estoque (
        tipo_movimento,
        quantidade,
        produto_id,
        ordem_producao_id,
        created_by,
        observacoes
      ) VALUES (
        ''entrada_producao'',
        NEW.quantidade_produzida,
        v_ordem_producao.produto_final_id,
        NEW.ordem_producao_id,
        NEW.created_by,
        ''Produção finalizada - OP '' || v_ordem_producao.numero_op
      );

      RETURN NEW;
    END;
    $finalizar_function$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_finalizar_ordem_producao
      AFTER INSERT ON registro_producao_real
      FOR EACH ROW
      EXECUTE FUNCTION finalizar_ordem_producao();

    COMMENT ON TABLE registro_producao_real IS ''Registro da produção real e controle de qualidade'';
    ';
  END IF;
END $$;