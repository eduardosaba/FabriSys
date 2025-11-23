-- Criação da tabela fichas_tecnicas para armazenar receitas de produção
-- Migration: 032_setup_fichas_tecnicas

DO $$
DECLARE
  tabela_existe BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fichas_tecnicas'
  ) INTO tabela_existe;

  IF NOT tabela_existe THEN
    EXECUTE '
    CREATE TABLE fichas_tecnicas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      
      -- Relacionamento com produto final
      produto_final_id UUID NOT NULL REFERENCES produtos_finais(id) ON DELETE CASCADE,
      
      -- Relacionamento com insumo
      insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
      
      -- Dados da receita
      quantidade DECIMAL(10,4) NOT NULL, -- Quantidade do insumo necessária (ex: 0.15 kg)
      unidade_medida VARCHAR(20) NOT NULL, -- Unidade de medida (kg, ml, un, etc)
      perda_padrao DECIMAL(5,2) DEFAULT 0, -- Percentual de perda esperada (ex: 5%)
      
      -- Informações de produção
      rendimento_unidades DECIMAL(10,2) DEFAULT 1, -- Quantas unidades o produto rende
      instrucoes TEXT, -- Instruções de preparo/uso do insumo
      tempo_preparo_minutos INTEGER, -- Tempo de preparo estimado
      ordem_producao INTEGER, -- Ordem de uso dos insumos na produção
      
      -- Controle de versão e ativação
      versao INTEGER DEFAULT 1, -- Permite manter histórico de versões da ficha técnica
      ativo BOOLEAN DEFAULT true, -- Apenas a versão ativa é usada na produção
      
      -- Auditoria
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id)
    );

    -- Índices para performance
    CREATE INDEX fichas_tecnicas_produto_idx ON fichas_tecnicas(produto_final_id);
    CREATE INDEX fichas_tecnicas_insumo_idx ON fichas_tecnicas(insumo_id);
    CREATE INDEX fichas_tecnicas_ativo_idx ON fichas_tecnicas(ativo);
    CREATE INDEX fichas_tecnicas_versao_idx ON fichas_tecnicas(produto_final_id, versao);

    -- Trigger para atualizar updated_at
    CREATE OR REPLACE FUNCTION update_fichas_tecnicas_updated_at()
    RETURNS TRIGGER AS $function$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_fichas_tecnicas_timestamp
      BEFORE UPDATE ON fichas_tecnicas
      FOR EACH ROW
      EXECUTE FUNCTION update_fichas_tecnicas_updated_at();

    -- Row Level Security
    ALTER TABLE fichas_tecnicas ENABLE ROW LEVEL SECURITY;

    -- Policies (remove políticas existentes antes de criar)
    DROP POLICY IF EXISTS "Admin tem acesso total" ON fichas_tecnicas;
    DROP POLICY IF EXISTS "Fábrica pode visualizar fichas técnicas ativas" ON fichas_tecnicas;
    
    CREATE POLICY "Admin tem acesso total"
      ON fichas_tecnicas
      FOR ALL
      TO authenticated
      USING (auth.jwt() ->> 'role' = 'admin');

    CREATE POLICY "Fábrica pode visualizar fichas técnicas ativas"
      ON fichas_tecnicas
      FOR SELECT
      TO authenticated
      USING (
        auth.jwt() ->> 'role' IN ('admin', 'fabrica') 
        AND ativo = true
      );

    -- View para facilitar consultas com dados completos
    CREATE OR REPLACE VIEW v_fichas_tecnicas_completas AS
    SELECT 
      ft.id,
      ft.produto_final_id,
      pf.nome as produto_nome,
      pf.preco_venda,
      ft.insumo_id,
      ft.quantidade,
      ft.unidade_medida,
      ft.perda_padrao,
      ft.rendimento_unidades,
      ft.instrucoes,
      ft.tempo_preparo_minutos,
      ft.ordem_producao,
      ft.versao,
      ft.ativo,
      ft.created_at,
      ft.updated_at
    FROM fichas_tecnicas ft
    INNER JOIN produtos_finais pf ON ft.produto_final_id = pf.id
    WHERE ft.ativo = true
    ORDER BY pf.nome, ft.ordem_producao;

    -- Comentários
    COMMENT ON TABLE fichas_tecnicas IS ''Fichas técnicas de produção com receitas e custos'';
    COMMENT ON COLUMN fichas_tecnicas.quantidade IS ''Quantidade do insumo necessária para produzir o produto'';
    COMMENT ON COLUMN fichas_tecnicas.perda_padrao IS ''Percentual de perda esperada do insumo no processo de produção'';
    COMMENT ON COLUMN fichas_tecnicas.versao IS ''Versão da ficha técnica para controle de histórico'';
    COMMENT ON COLUMN fichas_tecnicas.ativo IS ''Indica se esta versão da ficha técnica está ativa'';
    ';
  END IF;
END $$;
