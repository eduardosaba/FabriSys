-- Script de execução passo-a-passo para Supabase
-- 1) Execute a parte de DDL + UPDATE (dentro de transaction)
BEGIN;

ALTER TABLE public.movimentacao_estoque
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid;

UPDATE public.movimentacao_estoque m
SET fornecedor_id = f.id
FROM public.fornecedores f
WHERE m.fornecedor IS NOT NULL
  AND trim(m.fornecedor) <> ''
  AND lower(trim(f.nome)) = lower(trim(m.fornecedor))
  AND m.fornecedor_id IS NULL;

COMMIT;

-- 2) Criar índice sem bloquear (execute como comando separado, NÃO dentro de transação)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movimentacao_fornecedor_id ON public.movimentacao_estoque(fornecedor_id);

-- 3) Verificações de integridade (execute e verifique os resultados)
-- Quantas linhas não receberam fornecedor_id
SELECT count(*) AS without_fornecedor_id
FROM public.movimentacao_estoque
WHERE fornecedor_id IS NULL;

-- Quantos fornecedores distintos sem correspondência
SELECT DISTINCT m.fornecedor
FROM public.movimentacao_estoque m
LEFT JOIN public.fornecedores f ON lower(trim(m.fornecedor)) = lower(trim(f.nome))
WHERE f.id IS NULL
ORDER BY m.fornecedor;

-- 4) Se quiser criar a FK (execute somente se invalid_fk_count = 0)
-- ALTER TABLE public.movimentacao_estoque
--   ADD CONSTRAINT fk_movimentacao_fornecedor_id FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;

-- FIM
