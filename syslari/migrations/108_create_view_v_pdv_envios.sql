-- 108_create_view_v_pdv_envios.sql
-- View consolidada para o PDV ver envios/recebimentos

CREATE OR REPLACE VIEW public.v_pdv_envios AS
SELECT
  eh.id AS envio_id,
  eh.distrib_id,
  eh.ordem_producao_id,
  eh.produto_id,
  p.nome AS produto_nome,
  eh.quantidade,
  eh.local_origem_id,
  lo.nome AS origem_nome,
  eh.local_destino_id,
  ld.nome AS destino_nome,
  eh.enviado_por,
  eh.enviado_em,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='envios_historico' AND column_name='recebido_em') THEN eh.recebido_em ELSE NULL END AS recebido_em,
  eh.status,
  eh.observacao,
  eh.created_at
FROM public.envios_historico eh
LEFT JOIN public.produtos_finais p ON p.id = eh.produto_id
LEFT JOIN public.locais lo ON lo.id = eh.local_origem_id
LEFT JOIN public.locais ld ON ld.id = eh.local_destino_id;

GRANT SELECT ON public.v_pdv_envios TO authenticated;
GRANT SELECT ON public.v_pdv_envios TO anon;
