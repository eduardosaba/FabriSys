-- Migration: 028_create_historico_view_and_policies.sql
-- Objetivo: criar VIEW `historico_estoque` compatível com o formato legacy
-- e garantir políticas RLS mínimas para `movimentacao_estoque`.

BEGIN;

-- 1) Criar a view `historico_estoque` que expõe colunas esperadas pelo frontend.
-- A view normaliza nomes e inclui um objeto JSON `insumo` com `nome` e `unidade_estoque`.
CREATE OR REPLACE VIEW public.historico_estoque AS
SELECT
  m.id,
  COALESCE(m.data_movimento, m.created_at, now())::timestamptz AS created_at,
  COALESCE(m.tipo_movimento, m.tipo) AS tipo,
  m.quantidade AS quantidade,
  m.observacoes AS nf,
  COALESCE(f.nome, m.fornecedor) AS fornecedor,
  jsonb_build_object(
    'nome', COALESCE(i.nome, ''),
    'unidade_estoque', COALESCE(i.unidade_medida, '')
  ) AS insumo
FROM public.movimentacao_estoque m
LEFT JOIN public.insumos i ON m.insumo_id = i.id
LEFT JOIN public.fornecedores f ON (f.id::text = m.fornecedor OR f.nome = m.fornecedor);

-- Comentário: a view fornece um campo `insumo` do tipo JSONB com os campos
-- `nome` e `unidade_estoque`. O frontend que fazia `.select('insumo:insumos(nome, unidade_estoque)')`
-- pode precisar ser adaptado se exigir relacionamento via foreign key; a view mantém
-- compatibilidade em forma de campo JSON.

-- 2) Garantir que RLS esteja habilitado e políticas básicas existam na tabela real
-- `movimentacao_estoque` (a view usa os dados dessa tabela; políticas nela são aplicadas).
ALTER TABLE public.movimentacao_estoque ENABLE ROW LEVEL SECURITY;

-- Policy: permitir SELECT para usuários autenticados
DROP POLICY IF EXISTS "Usuários autenticados podem ver movimentações" ON public.movimentacao_estoque;
CREATE POLICY "Usuários autenticados podem ver movimentações"
  ON public.movimentacao_estoque FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: permitir INSERT para usuários autenticados
DROP POLICY IF EXISTS "Usuários autenticados podem criar movimentações" ON public.movimentacao_estoque;
CREATE POLICY "Usuários autenticados podem criar movimentações"
  ON public.movimentacao_estoque FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: permitir UPDATE para usuários autenticados (opcional)
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar movimentações" ON public.movimentacao_estoque;
CREATE POLICY "Usuários autenticados podem atualizar movimentações"
  ON public.movimentacao_estoque FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 3) Grants (opcionais) — em alguns setups você pode querer conceder SELECT na view
-- para o role público/anon. Evite conceder a anon se sua API exige autenticação.
-- GRANT SELECT ON public.historico_estoque TO authenticated;

COMMIT;

-- Notas de aplicação:
-- - Cole este SQL no Supabase SQL Editor e execute como usuário com privilégios de esquema.
-- - Se você usa políticas mais restritivas (por exemplo, verificações por user_id), adapte as
--   expressões `USING` / `WITH CHECK` para refletir essas regras.
-- - Após aplicar, a view `historico_estoque` estará disponível via PostgREST (Supabase REST) e
--   retornará um campo `insumo` em JSON com `nome` e `unidade_estoque`.
