-- Migration: 053_add_fornecedor_id_movimentacao.sql
-- Objetivo: adicionar coluna fornecedor_id (uuid) em movimenacao_estoque,
-- fazer backfill a partir do nome existente quando possível e adicionar FK/index.

-- OBSERVAÇÃO: Este arquivo é adequado para controle de versão. Para execução no
-- Supabase SQL Editor recomenda-se executar em etapas (ver script em /scripts).

BEGIN;

-- 1) Adiciona a coluna fornecedor_id caso não exista
ALTER TABLE public.movimentacao_estoque
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid;

-- 2) Backfill: quando o campo legado `fornecedor` contém o nome de um fornecedor,
-- preencha fornecedor_id com o id correspondente
UPDATE public.movimentacao_estoque m
SET fornecedor_id = f.id
FROM public.fornecedores f
WHERE m.fornecedor IS NOT NULL
  AND trim(m.fornecedor) <> ''
  AND f.nome = m.fornecedor
  AND m.fornecedor_id IS NULL;

COMMIT;

-- 3) Criar índice para consultas por fornecedor_id (rodar separadamente, NÃO dentro de transação)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movimentacao_fornecedor_id ON public.movimentacao_estoque(fornecedor_id);

-- 4) Adicionar constraint FK (opcionalmente, caso queira garantir integridade)
-- Observe: se houver valores em fornecedor_id que não apontam para fornecedores.id,
-- a criação do FK irá falhar. Execute apenas se o backfill for suficiente.
-- Verificação mais segura por nome de constraint (evita erro se já existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimentacao_fornecedor_id'
  ) THEN
    BEGIN
      ALTER TABLE public.movimentacao_estoque
        ADD CONSTRAINT fk_movimentacao_fornecedor_id FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Não foi possível adicionar FK automaticamente - verifique os dados e aplique manualmente se desejado.';
    END;
  ELSE
    RAISE NOTICE 'Constraint fk_movimentacao_fornecedor_id já existe; nenhuma ação necessária.';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Erro ao avaliar ou criar constraint fk_movimentacao_fornecedor_id - verifique manualmente.';
END
$$;

-- Notas:
-- 1) Rode esta migration no Supabase SQL Editor com permissões de admin.
-- 2) Se preferir, execute apenas as seções de ADD COLUMN/UPDATE primeiro,
--    verifique os dados e então crie o índice e a FK.
-- 3) Após aplicar, o frontend poderá gravar `fornecedor_id` no INSERT para melhor integridade.
-- Migration: 053_add_fornecedor_id_movimentacao.sql
-- Objetivo: adicionar coluna fornecedor_id (uuid) em movimenacao_estoque,
-- fazer backfill a partir do nome existente quando possível e adicionar FK/index.

BEGIN;

-- 1) Adiciona a coluna fornecedor_id caso não exista
ALTER TABLE public.movimentacao_estoque
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid;

-- 2) Backfill: quando o campo legado `fornecedor` contém o nome de um fornecedor,
-- preencha fornecedor_id com o id correspondente
UPDATE public.movimentacao_estoque m
SET fornecedor_id = f.id
FROM public.fornecedores f
WHERE m.fornecedor IS NOT NULL
  AND trim(m.fornecedor) <> ''
  AND f.nome = m.fornecedor
  AND m.fornecedor_id IS NULL;

-- 3) Criar índice para consultas por fornecedor_id
CREATE INDEX IF NOT EXISTS idx_movimentacao_fornecedor_id ON public.movimentacao_estoque(fornecedor_id);

-- 4) Adicionar constraint FK (opcionalmente, caso queira garantir integridade)
-- Observe: se houver valores em fornecedor_id que não apontam para fornecedores.id,
-- a criação do FK irá falhar. Execute apenas se o backfill for suficiente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'movimentacao_estoque' AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'fornecedor_id'
  ) THEN
    ALTER TABLE public.movimentacao_estoque
      ADD CONSTRAINT fk_movimentacao_fornecedor_id FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Não foi possível adicionar FK automaticamente - verifique os dados e aplique manualmente se desejado.';
END
$$;

COMMIT;

-- Notas:
-- 1) Rode esta migration no Supabase SQL Editor com permissões de admin.
-- 2) Se preferir, execute apenas as seções de ADD COLUMN/UPDATE/CREATE INDEX primeiro,
--    verifique os dados e então crie a FK.
-- 3) Após aplicar, o frontend poderá gravar `fornecedor_id` no INSERT para melhor integridade.
