-- Adiciona novos campos na tabela fornecedores
ALTER TABLE fornecedores 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT;

-- Remove a coluna contato que não é mais usada
ALTER TABLE fornecedores 
  DROP COLUMN IF EXISTS contato;

-- Configura RLS (Row Level Security)
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;

-- Cria políticas de segurança
DROP POLICY IF EXISTS "Usuários autenticados podem ler fornecedores" ON "public"."fornecedores";
CREATE POLICY "Usuários autenticados podem ler fornecedores" ON "public"."fornecedores"
  FOR ALL
  TO authenticated
  USING (true);

-- Adiciona validações
ALTER TABLE fornecedores
  ADD CONSTRAINT email_valido CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL),
  ADD CONSTRAINT telefone_valido CHECK (telefone ~ '^\d{10,11}$' OR telefone IS NULL);

-- Atualiza comentários das colunas
COMMENT ON COLUMN fornecedores.email IS 'Email do fornecedor (opcional)';
COMMENT ON COLUMN fornecedores.telefone IS 'Telefone do fornecedor (opcional, 10-11 dígitos)';
COMMENT ON COLUMN fornecedores.endereco IS 'Endereço do fornecedor (opcional)';