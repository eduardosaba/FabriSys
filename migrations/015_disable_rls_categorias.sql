-- Remover temporariamente as políticas RLS para desenvolvimento
ALTER TABLE categorias DISABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houverem
DROP POLICY IF EXISTS select_categorias ON categorias;
DROP POLICY IF EXISTS manage_categorias ON categorias;

-- Garantir acesso público temporário
GRANT ALL ON categorias TO anon;
GRANT USAGE, SELECT ON SEQUENCE categorias_id_seq TO anon;