-- 106_dedupe_and_apply_all.sql
-- Script consolidado:
-- 1) Cria backup da tabela configuracoes_sistema
-- 2) Lista duplicatas por (chave, organization_id)
-- 3) Remove duplicatas mantendo o registro mais antigo (por created_at)
-- 4) Garante timestamps e cria índice único/coalesce para suportar ON CONFLICT
-- 5) Aplica alterações de schema (locais.dias_funcionamento, metas_vendas.dias_defuncionamento, metas_vendas.meta_total)
-- 6) Executa backfill de meta_total e dias_defuncionamento

-- Execute este script no editor SQL do Supabase em um ambiente de testes antes de aplicar em produção.
-- Recomendo revisar os resultados do SELECT de duplicatas antes de executar a parte de DELETE.

BEGIN;

-- 1) Backup (dados)
-- Criar backup com estrutura idêntica; se já existir, recria para garantir colunas iguais
DROP TABLE IF EXISTS backup_configuracoes_sistema;
CREATE TABLE backup_configuracoes_sistema (LIKE public.configuracoes_sistema INCLUDING ALL);

-- Inserir apenas colunas não-geradas para evitar erro em colunas GENERATED
DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ',')
  INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'configuracoes_sistema'
    AND is_generated = 'NEVER';

  IF cols IS NULL THEN
    RAISE EXCEPTION 'Nenhuma coluna encontrada para inserir em backup_configuracoes_sistema';
  END IF;

  EXECUTE format('INSERT INTO backup_configuracoes_sistema (%s) SELECT %s FROM public.configuracoes_sistema', cols, cols);
END$$;

-- 2) Mostrar duplicatas (por chave + organização)
-- Revise o resultado deste SELECT antes de prosseguir com o DELETE abaixo.
SELECT chave,
       coalesce(organization_id::text,'__global__') AS org,
       count(*) AS cnt
FROM public.configuracoes_sistema
GROUP BY chave, coalesce(organization_id::text,'__global__')
HAVING count(*) > 1
ORDER BY cnt DESC;

-- 3) Dedupe: remove registros duplicados mantendo o mais antigo (created_at NULLS FIRST)
WITH ranked AS (
  SELECT id, chave, coalesce(organization_id::text,'__global__') AS org,
         row_number() OVER (
           PARTITION BY chave, coalesce(organization_id::text,'__global__')
           ORDER BY created_at NULLS FIRST, id
         ) AS rn
  FROM public.configuracoes_sistema
)
DELETE FROM public.configuracoes_sistema
USING ranked
WHERE public.configuracoes_sistema.id = ranked.id
  AND ranked.rn > 1;

-- 4) Normalizar timestamps e criar índices/constraint necessários para ON CONFLICT
UPDATE public.configuracoes_sistema SET created_at = now() WHERE created_at IS NULL;
UPDATE public.configuracoes_sistema SET updated_at = now() WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_organization ON public.configuracoes_sistema (organization_id);

-- Índice/constraint único que representa (coalesce(organization_id,'__global__'), chave)
CREATE UNIQUE INDEX IF NOT EXISTS uq_configuracoes_sistema_chave_org
  ON public.configuracoes_sistema ((coalesce(organization_id::text, '__global__')), chave);

-- 5) Alterações de schema seguras (IF NOT EXISTS)
ALTER TABLE IF EXISTS public.locais ADD COLUMN IF NOT EXISTS dias_funcionamento smallint[];
-- Inicializa com todos os dias da semana, se nulo
UPDATE public.locais SET dias_funcionamento = ARRAY[0,1,2,3,4,5,6] WHERE dias_funcionamento IS NULL;

ALTER TABLE IF EXISTS public.metas_vendas ADD COLUMN IF NOT EXISTS dias_defuncionamento integer;
ALTER TABLE IF EXISTS public.metas_vendas ADD COLUMN IF NOT EXISTS meta_total numeric(14,2);

-- 6) Backfill meta_total: soma por local + data_referencia
WITH sums AS (
  SELECT local_id, data_referencia, SUM(valor_meta)::numeric(14,2) AS total
  FROM public.metas_vendas
  GROUP BY local_id, data_referencia
)
UPDATE public.metas_vendas m
SET meta_total = s.total
FROM sums s
WHERE m.local_id = s.local_id
  AND m.data_referencia = s.data_referencia;

-- Backfill dias_defuncionamento: preferir cardinality(locais.dias_funcionamento), senão contar dias com valor_meta <> 0
UPDATE public.metas_vendas m
SET dias_defuncionamento = COALESCE(
  (SELECT cardinality(l.dias_funcionamento) FROM public.locais l WHERE l.id = m.local_id),
  (SELECT COUNT(*) FROM public.metas_vendas mv WHERE mv.local_id = m.local_id AND mv.data_referencia = m.data_referencia AND mv.valor_meta <> 0)
)
WHERE m.dias_defuncionamento IS NULL;

COMMIT;

-- Observações finais:
-- - Revise o resultado do SELECT de duplicatas antes de executar o script completo.
-- - Se você quiser apenas listar duplicatas sem apagar, comente a seção de DELETE (o CTE `ranked` + DELETE).
-- - Após aplicar, monitore logs e testes da UI (configurações e PDV) para confirmar que os erros 42P10/400 cessaram.
