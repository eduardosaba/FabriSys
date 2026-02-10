-- Migration: 057_add_fornecedores_categoria_avaliacao.sql
-- Objetivo: Garantir que a tabela `fornecedores` tenha as colunas usadas pela UI
-- Execute no Supabase SQL Editor (staging/production) conforme seu fluxo de deploy.

BEGIN;

-- Adiciona categoria com valor padrão 'Outros'
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'Outros';

-- Adiciona avaliacao com default 5
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS avaliacao integer NOT NULL DEFAULT 5;

-- Campos opcionais (nullable)
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS telefone text;

ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS endereco text;

COMMIT;

-- Notas:
-- 1) Esses comandos são idempotentes (usam IF NOT EXISTS) — seguros para re-executar.
-- 2) Se houver dados em formatos incompatíveis (ex: coluna `avaliacao` já existe com outro tipo),
--    avalie manualmente e use um `ALTER COLUMN ... USING (...)` com cuidado.
-- 3) Após executar, aguarde alguns segundos e recarregue o painel do Supabase para atualizar o schema cache.
-- 4) Recomendo executar primeiro no ambiente de staging e testar a UI antes de aplicar em produção.
