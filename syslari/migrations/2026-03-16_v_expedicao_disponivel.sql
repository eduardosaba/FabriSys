-- View que expõe apenas distribuições prontas para expedição
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
-- aceitar ambas variações que aparecem no Kanban ('finalizada' e 'concluido')
WHERE public.is_ordem_producao_concluida(o.status::text)
  AND d.status = 'pendente';
