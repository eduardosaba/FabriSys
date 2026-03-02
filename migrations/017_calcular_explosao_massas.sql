-- 017_calcular_explosao_massas.sql
-- Função RPC que recebe um JSONB com itens planejados
-- e retorna as massas (semi-acabados) necessárias, saldo atual e sugestão de produção.

CREATE OR REPLACE FUNCTION calcular_explosao_massas(
  p_itens_planejados JSONB
)
RETURNS TABLE (
  massa_id UUID,
  massa_nome TEXT,
  quantidade_necessaria_total NUMERIC,
  saldo_estoque_atual NUMERIC,
  sugestao_producao NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH lista_pedidos AS (
    SELECT 
      (item->>'produto_id')::UUID as p_id,
      (item->>'quantidade')::NUMERIC as qtd
    FROM jsonb_array_elements(p_itens_planejados) AS item
  ),
  necessidade_calculada AS (
    SELECT 
      cp.item_id,
      p.nome::text as nome,
      SUM(cp.quantidade_necessaria * lp.qtd) as total_nec
    FROM lista_pedidos lp
    JOIN composicao_produto cp ON cp.produto_pai_id = lp.p_id
    JOIN produtos_finais p ON p.id = cp.item_id
    WHERE p.tipo = 'semi_acabado'
    GROUP BY cp.item_id, p.nome
  ),
  fabrica AS (
    SELECT id FROM locais WHERE tipo = 'fabrica' LIMIT 1
  )
  SELECT 
    nc.item_id,
    nc.nome,
    nc.total_nec::NUMERIC,
    COALESCE(ep.quantidade, 0)::NUMERIC as saldo,
    GREATEST(0, nc.total_nec - COALESCE(ep.quantidade, 0))::NUMERIC as sugestao
  FROM necessidade_calculada nc
  LEFT JOIN estoque_produtos ep ON ep.produto_id = nc.item_id 
    AND ep.local_id = (SELECT id FROM fabrica)
  ;
END;
$$;

-- Conceder permissões de execução ao papel anônimo se necessário (ajustar políticas em RLS)
-- GRANT EXECUTE ON FUNCTION calcular_explosao_massas(JSONB) TO anon;
