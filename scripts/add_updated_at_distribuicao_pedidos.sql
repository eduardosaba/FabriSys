-- Garante que a coluna updated_at exista em distribuicao_pedidos
ALTER TABLE distribuicao_pedidos 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Execute este script no editor SQL do seu banco (Supabase/pgAdmin/psql)
