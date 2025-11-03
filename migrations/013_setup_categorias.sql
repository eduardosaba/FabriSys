-- Criar tabela de categorias
CREATE TABLE IF NOT EXISTS categorias (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Adicionar dados iniciais de categorias
INSERT INTO categorias (nome) VALUES
  ('Laticínios'),
  ('Grãos'),
  ('Embalagens'),
  ('Secos'),
  ('Congelados'),
  ('Conservantes'),
  ('Temperos'),
  ('Utensílios')
ON CONFLICT (nome) DO NOTHING;

-- Adicionar coluna categoria_id na tabela insumos
ALTER TABLE insumos
ADD COLUMN IF NOT EXISTS categoria_id BIGINT REFERENCES categorias(id);

-- Adicionar coluna atributos_dinamicos
ALTER TABLE insumos
ADD COLUMN IF NOT EXISTS atributos_dinamicos JSONB DEFAULT '{}'::jsonb;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_insumos_categoria_id ON insumos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_categorias_nome ON categorias(nome);

-- Adicionar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_timestamp_categorias
  BEFORE UPDATE ON categorias
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Nota: Políticas RLS serão adicionadas quando o módulo de autenticação estiver pronto
-- Por enquanto, a tabela ficará com acesso público para desenvolvimento