-- Recria a view `historico_estoque` garantindo que o campo `insumo`
-- seja sempre um objeto JSON (ou NULL) com os campos esperados pelo frontend.
-- Rode este script no SQL Editor do Supabase.

-- OBS: Se a view existente tiver colunas com nomes diferentes, o
-- `CREATE OR REPLACE VIEW` pode falhar com erro 42P16. Para evitar
-- isso, aqui descartamos a view antes de recriá-la. Use com cautela
-- (dependências de objetos podem ser removidas). Se preferir
-- preservar dependências, use `ALTER VIEW ... RENAME COLUMN ...`
-- manualmente conforme as colunas atuais.

DROP VIEW IF EXISTS public.historico_estoque CASCADE;

CREATE VIEW public.historico_estoque AS
SELECT
  m.id,
  COALESCE(m.data_movimento, m.created_at, now())::timestamptz AS created_at,
  COALESCE(m.tipo_movimento, m.tipo) AS tipo,
  m.quantidade AS quantidade,
  m.observacoes AS nf,
  COALESCE(f.nome, m.fornecedor) AS fornecedor,
  jsonb_build_object(
    'id', i.id,
    'nome', COALESCE(i.nome, ''),
    'unidade_estoque', COALESCE(i.unidade_estoque, i.unidade_medida, '')
  ) AS insumo,
  m.lote,
  m.validade
FROM public.movimentacao_estoque m
LEFT JOIN public.insumos i ON i.id = m.insumo_id
LEFT JOIN public.fornecedores f ON (f.id::text = m.fornecedor OR f.nome = m.fornecedor);

-- Observações:
-- - Se você usa RLS, verifique as políticas em `insumos` e `movimentacao_estoque`.
-- - Após executar, recarregue a aplicação frontend para validar a mudança.
