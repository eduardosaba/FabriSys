-- View que consolida itens vendidos por sessão de caixa
CREATE OR REPLACE VIEW public.v_detalhes_fechamento_caixa AS
SELECT
  v.caixa_id,
  p.nome AS produto_nome,
  SUM(iv.quantidade) AS qtd_total,
  SUM(iv.subtotal) AS valor_total
FROM public.itens_venda iv
JOIN public.vendas v ON iv.venda_id = v.id
JOIN public.produtos_finais p ON iv.produto_id = p.id
GROUP BY v.caixa_id, p.nome;

-- Recomenda-se aplicar esta view após as migrations de vendas/itens estarem em ordem.
