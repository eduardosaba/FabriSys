-- Habilitar RLS para a tabela categorias
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir SELECT para todos os usuários autenticados
CREATE POLICY select_categorias ON categorias
  FOR SELECT USING (auth.role() = 'authenticated');

-- Criar política para permitir INSERT/UPDATE/DELETE para usuários autenticados
CREATE POLICY manage_categorias ON categorias
  FOR ALL USING (auth.role() = 'authenticated');

-- Garantir acesso à tabela para o role authenticated
GRANT ALL ON categorias TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE categorias_id_seq TO authenticated;