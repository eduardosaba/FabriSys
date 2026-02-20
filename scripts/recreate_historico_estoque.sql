-- Recria a view `historico_estoque` garantindo que o campo `insumo`
-- seja sempre um objeto JSON (ou NULL) com os campos esperados pelo frontend.
-- Rode este script no SQL Editor do Supabase.

CREATE OR REPLACE VIEW public.historico_estoque AS
SELECT
  m.id,
  m.tipo_movimento,
  m.quantidade,
  m.data_movimento,
  m.observacoes,
  m.referencia_id,
  m.created_by,
  m.organization_id,
  m.insumo_id,
  CASE
    WHEN i.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'id', i.id,
      'nome', i.nome,
      'unidade_estoque', i.unidade_estoque
    )
  END AS insumo
FROM public.movimentacao_estoque m
LEFT JOIN public.insumos i ON i.id = m.insumo_id;

-- Observações:
-- - Se você usa RLS, verifique as políticas em `insumos` e `movimentacao_estoque`.
-- - Após executar, recarregue a aplicação frontend para validar a mudança.
