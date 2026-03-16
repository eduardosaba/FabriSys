-- Funções de compatibilidade para normalizar/interpretar status de ordens de produção
-- Cria helpers que unificam valores diferentes ('finalizada' -> 'concluido')

CREATE OR REPLACE FUNCTION public.is_ordem_producao_concluida(p_status text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_status IS NULL THEN
    RETURN false;
  END IF;

  IF lower(trim(p_status)) IN ('concluido', 'finalizada') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_ordem_producao_status(p_status text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_status IS NULL THEN
    RETURN NULL;
  END IF;

  IF lower(trim(p_status)) = 'finalizada' THEN
    RETURN 'concluido';
  END IF;

  RETURN p_status;
END;
$$;

-- Grants (opcional): permitir execução por roles autenticadas via view/rpc
GRANT EXECUTE ON FUNCTION public.is_ordem_producao_concluida(text) TO public;
GRANT EXECUTE ON FUNCTION public.normalize_ordem_producao_status(text) TO public;
