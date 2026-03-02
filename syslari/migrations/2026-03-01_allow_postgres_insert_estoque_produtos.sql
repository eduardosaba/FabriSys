-- Permite INSERTs na tabela estoque_produtos quando executados pelo papel postgres
-- Uso: execute no Supabase SQL Editor com privilégios de owner

BEGIN;

-- Garante que RLS esteja ativo (idempotente)
ALTER TABLE IF EXISTS public.estoque_produtos ENABLE ROW LEVEL SECURITY;

-- Remove policy anterior com o mesmo nome, se houver
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'estoque_produtos' AND n.nspname = 'public' AND p.polname = 'allow_postgres_insert'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS allow_postgres_insert ON public.estoque_produtos';
  END IF;
END$$;

-- Cria policy que permite INSERT quando o papel atual é postgres
CREATE POLICY allow_postgres_insert
  ON public.estoque_produtos
  FOR INSERT
  TO postgres
  WITH CHECK (true);

COMMIT;
