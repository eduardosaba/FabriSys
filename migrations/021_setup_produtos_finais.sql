-- Configuração inicial da tabela de produtos finais
-- Migrate up
DO $$
DECLARE
  tabela_existe BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'produtos_finais'
  ) INTO tabela_existe;

  IF NOT tabela_existe THEN
    EXECUTE '
    CREATE TABLE produtos_finais (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nome VARCHAR(255) NOT NULL,
      descricao TEXT,
      preco_venda DECIMAL(10,2) NOT NULL,
      cmp DECIMAL(10,2), -- Custo de Produção Atual (calculado)
      ativo BOOLEAN DEFAULT true,
      imagem_url TEXT, -- URL da imagem do produto
      codigo_interno VARCHAR(50) UNIQUE, -- Código de referência interno
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX produtos_finais_nome_idx ON produtos_finais(nome);
    CREATE INDEX produtos_finais_codigo_idx ON produtos_finais(codigo_interno);

    CREATE OR REPLACE FUNCTION update_produtos_finais_updated_at()
    RETURNS TRIGGER AS $function$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_produtos_finais_timestamp
      BEFORE UPDATE ON produtos_finais
      FOR EACH ROW
      EXECUTE FUNCTION update_produtos_finais_updated_at();

    ALTER TABLE produtos_finais ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Acesso total para admin"
      ON produtos_finais
      FOR ALL
      TO authenticated
      USING (auth.jwt() ->> ''role'' = ''admin'');

    CREATE POLICY "Fábrica pode visualizar produtos"
      ON produtos_finais
      FOR SELECT
      TO authenticated
      USING (auth.jwt() ->> ''role'' IN (''admin'', ''fabrica''));

    CREATE POLICY "PDV pode visualizar produtos ativos"
      ON produtos_finais
      FOR SELECT
      TO authenticated
      USING (auth.jwt() ->> ''role'' = ''pdv'' AND ativo = true);

    COMMENT ON TABLE produtos_finais IS ''Tabela de produtos finais produzidos pela fábrica'';
    ';
  END IF;
END $$;