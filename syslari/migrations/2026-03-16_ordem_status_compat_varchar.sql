-- Wrappers para aceitar `character varying` e evitar erros de resolução de função
-- Chamam as implementações em texto já existentes.

CREATE OR REPLACE FUNCTION public.is_ordem_producao_concluida(p_status character varying)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT public.is_ordem_producao_concluida(p_status::text);
$$;

CREATE OR REPLACE FUNCTION public.normalize_ordem_producao_status(p_status character varying)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT public.normalize_ordem_producao_status(p_status::text);
$$;

GRANT EXECUTE ON FUNCTION public.is_ordem_producao_concluida(character varying) TO public;
GRANT EXECUTE ON FUNCTION public.normalize_ordem_producao_status(character varying) TO public;
