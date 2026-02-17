-- 102_rpc_has_column.sql
-- Cria uma RPC simples para checar existência de coluna em uma tabela.

BEGIN;

DROP FUNCTION IF EXISTS public.has_column(text, text);

CREATE OR REPLACE FUNCTION public.has_column(p_table_name text, p_column_name text)
RETURNS boolean AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table_name AND column_name = p_column_name
  ) INTO v_exists;

  RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.has_column(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_column(text, text) TO anon;

COMMIT;
