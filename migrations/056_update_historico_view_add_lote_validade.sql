-- Migration: 056_update_historico_view_add_lote_validade.sql
-- Objetivo: atualizar a VIEW `historico_estoque` para expor os campos
-- `lote` e `validade`, mantendo compatibilidade com o formato legacy.
-- Aplique este SQL no Supabase SQL Editor (staging primeiro) como usuário com privilégios.

BEGIN;

-- Se a view existir, removemos antes para garantir recriação limpa.
DROP VIEW IF EXISTS public.historico_estoque;

-- Criar a view explicitando a lista de colunas para evitar incompatibilidades
CREATE VIEW public.historico_estoque (
  id,
  created_at,
  tipo,
  quantidade,
  nf,
  fornecedor,
  lote,
  validade,
  insumo
) AS
SELECT
  m.id,
  COALESCE(m.data_movimento, m.created_at, now())::timestamptz AS created_at,
  COALESCE(m.tipo_movimento, m.tipo) AS tipo,
  m.quantidade AS quantidade,
  m.observacoes AS nf,
  COALESCE(f.nome, m.fornecedor) AS fornecedor,
  m.lote AS lote,
  m.validade::date AS validade,
  jsonb_build_object(
    'nome', COALESCE(i.nome, ''),
    'unidade_estoque', COALESCE(i.unidade_estoque, i.unidade_medida, '')
  ) AS insumo
FROM public.movimentacao_estoque m
LEFT JOIN public.insumos i ON m.insumo_id = i.id
LEFT JOIN public.fornecedores f ON (f.id::text = m.fornecedor OR f.nome = m.fornecedor);

-- OBS: Se sua aplicação depende de tipos/formatos específicos (ex: validade como timestamp),
-- ajuste o cast `m.validade::date` para a forma desejada (timestamp/ timestamptz / text).

COMMIT;

-- ROLLBACK (manual, se necessário):
-- BEGIN; ALTER VIEW public.historico_estoque RENAME TO historico_estoque_old; COMMIT;
