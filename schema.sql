-- Módulo 1: Gestão de Estoque e Compras
-- Este script define as tabelas iniciais para o controle de insumos e fornecedores.

-- Tabela para armazenar dados dos fornecedores.
CREATE TABLE fornecedores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  nome text NOT NULL,
  cnpj text UNIQUE,
  contato text
);

-- Habilita RLS (Row Level Security) para a tabela de fornecedores.
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;

-- Política de acesso: Permite que usuários autenticados realizem todas as operações.
CREATE POLICY "Allow all for authenticated users" ON fornecedores
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- Tabela para o catálogo de insumos (matérias-primas).
CREATE TABLE insumos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  nome text NOT NULL UNIQUE,
  unidade_medida text NOT NULL, -- Ex: 'kg', 'g', 'un', 'L', 'mL'
  estoque_minimo_alerta numeric NOT NULL DEFAULT 0
);

-- Habilita RLS para a tabela de insumos.
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;

-- Política de acesso: Permite que usuários autenticados realizem todas as operações.
CREATE POLICY "Allow all for authenticated users" ON insumos
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- Tabela para rastrear cada lote de insumo que entra no estoque.
CREATE TABLE lotes_insumos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  insumo_id uuid NOT NULL REFERENCES insumos(id),
  fornecedor_id uuid REFERENCES fornecedores(id),
  quantidade_inicial numeric NOT NULL,
  quantidade_restante numeric NOT NULL,
  data_recebimento date NOT NULL DEFAULT now(),
  data_validade date,
  numero_lote text,
  numero_nota_fiscal text
);

-- Habilita RLS para a tabela de lotes.
ALTER TABLE lotes_insumos ENABLE ROW LEVEL SECURITY;

-- Política de acesso: Permite que usuários autenticados realizem todas as operações.
CREATE POLICY "Allow all for authenticated users" ON lotes_insumos
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
