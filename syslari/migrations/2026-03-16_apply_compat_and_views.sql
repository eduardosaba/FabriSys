-- Combined script: cria funções de compatibilidade (text + varchar wrappers) e recria as views
-- Execute este script inteiro no Supabase SQL Editor.

-- 1) Funções base (text)
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

GRANT EXECUTE ON FUNCTION public.is_ordem_producao_concluida(text) TO public;
GRANT EXECUTE ON FUNCTION public.normalize_ordem_producao_status(text) TO public;

-- 2) Wrappers que aceitam character varying
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

-- 3) Recria view de expedição (usa a função de compatibilidade)
CREATE OR REPLACE VIEW public.v_expedicao_disponivel AS
SELECT
  d.id,
  d.quantidade_solicitada,
  d.local_destino_id,
  d.status as status_envio,
  d.organization_id,
  d.created_at,
  d.ordem_producao_id,
  p.id as produto_id,
  p.nome as produto_nome,
  l.nome as destino_nome,
  o.numero_op,
  o.status as status_producao
FROM public.distribuicao_pedidos d
JOIN public.produtos_finais p ON d.produto_id = p.id
JOIN public.locais l ON d.local_destino_id = l.id
JOIN public.ordens_producao o ON d.ordem_producao_id = o.id
WHERE public.is_ordem_producao_concluida(o.status::text)
  AND d.status = 'pendente';

-- 4) Recria view de KPIs da fábrica (usa a função de compatibilidade)
CREATE OR REPLACE VIEW public.v_kpi_fabrica AS
SELECT
    -- Contagem de ordens que ainda estão no fluxo (não chegaram ao estagio 'finalizado')
    (SELECT count(*) FROM public.ordens_producao WHERE COALESCE(estagio_atual, '') <> 'finalizado') as ops_fila,
    (SELECT count(*)
       FROM public.distribuicao_pedidos d
       JOIN public.ordens_producao o ON d.ordem_producao_id = o.id
      WHERE d.status = 'pendente' AND public.is_ordem_producao_concluida(o.status::text)) as envios_pendentes,
    (SELECT COALESCE(sum(e.quantidade), 0)
       FROM public.estoque_produtos e
       JOIN public.locais l ON e.local_id = l.id
      WHERE l.tipo = 'fabrica') as total_estoque_fabrica,
    (SELECT count(*)
       FROM public.estoque_produtos e
       JOIN public.locais l ON e.local_id = l.id
      WHERE l.tipo = 'fabrica' AND e.quantidade < 20) as itens_estoque_baixo;

-- Fim do script combinado
