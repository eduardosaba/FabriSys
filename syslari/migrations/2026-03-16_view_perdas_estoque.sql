-- View: v_relatorio_perdas_estoque
-- Descrição: visão para auditoria de perdas (ajustes de inventário / quebras)
CREATE OR REPLACE VIEW public.v_relatorio_perdas_estoque AS
SELECT
  p.nome AS produto,
  l.nome AS unidade,
  m.quantidade AS quantidade_ajuste,
  COALESCE(m.tipo_movimento, m.tipo) AS tipo_movimento,
  COALESCE(m.created_at, m.data_movimento) AS data_evento,
  (m.quantidade * COALESCE(p.preco_venda, 0)) AS valor_prejuizo,
  COALESCE(m.destino, m.origem) AS movimento_local_id
FROM movimentacao_estoque m
JOIN produtos_finais p ON m.produto_id = p.id
JOIN locais l ON (m.destino = l.id::text OR m.origem = l.id::text)
WHERE COALESCE(m.tipo_movimento, m.tipo) IN ('ajuste_inventario', 'quebra_avaria')
ORDER BY data_evento DESC;
