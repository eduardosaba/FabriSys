-- 016_create_composicao_produto.sql
-- Cria tabela composicao_produto para definir ingredientes (permite referência a semi-acabados)

CREATE TABLE IF NOT EXISTS composicao_produto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_pai_id UUID NOT NULL REFERENCES produtos_finais(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES produtos_finais(id) ON DELETE RESTRICT,
  quantidade_necessaria NUMERIC(14,6) NOT NULL DEFAULT 0,
  unidade_medida VARCHAR(20) NOT NULL DEFAULT 'kg',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  organization_id UUID NULL
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_composicao_produto_produto_pai ON composicao_produto(produto_pai_id);
CREATE INDEX IF NOT EXISTS idx_composicao_produto_item ON composicao_produto(item_id);
