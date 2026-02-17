-- 200_concat_all_for_supabase.sql
-- Arquivo gerado automaticamente: concatena migrations críticas para colar no editor SQL do Supabase.
-- Ordem recomendada de execução:
-- 1) Atualizar função/trigger (`fn_sincronizar_semi_acabado_insumo`) para evitar falhas em triggers
-- 2) Rodar dedupe + criar índice único (`106_dedupe_and_apply_all.sql`) — revise duplicatas antes do DELETE
-- 3) Aplicar migrations de compatibilidade (preco_custo, data_entrega, forma_pagamento, valor_total)
-- 4) Executar backfill de metas (`105_backfill_metas_vendas.sql`)

-- IMPORTANTE:
-- - Teste em staging antes de rodar em produção.
-- - No Supabase SQL editor, cole tudo e execute passo a passo, revisando os SELECTs de duplicatas antes de confirmar deletes.

-- ============================================================================
-- 1) Atualiza função/trigger: fn_sincronizar_semi_acabado_insumo
-- ============================================================================

-- Begin of 2026-02-17_update_fn_sincronizar_semi_acabado_insumo.sql
BEGIN;

-- Garantir que trigger dependente seja removido antes de recriar a função
DROP TRIGGER IF EXISTS trg_sincronizar_semi_acabado ON public.produtos_finais;

-- Recreate function safely
DROP FUNCTION IF EXISTS public.fn_sincronizar_semi_acabado_insumo();

CREATE OR REPLACE FUNCTION public.fn_sincronizar_semi_acabado_insumo()
RETURNS TRIGGER AS $$
DECLARE
  new_json jsonb;
  v_unidade text := 'UN';
  v_custo numeric := 0;
  has_insumos_org boolean;
  v_org_text text;
  v_prod_text text;
  v_nome text;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Representar NEW como JSON para acessar chaves dinamicamente
    new_json := row_to_json(NEW)::jsonb;

    -- Verifica se tipo é semi_acabado sem acessar NEW.tipo diretamente
    IF (new_json->> 'tipo') = 'semi_acabado' THEN
      v_unidade := COALESCE(new_json->> 'unidade_estoque', 'UN');
      v_custo := COALESCE((new_json->> 'preco_custo')::numeric, 0);
      v_org_text := new_json->> 'organization_id';
      v_prod_text := new_json->> 'id';
      v_nome := new_json->> 'nome';

      has_insumos_org := EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'insumos' AND column_name = 'organization_id'
      );

      IF has_insumos_org THEN
        INSERT INTO public.insumos (organization_id, nome, unidade_medida, unidade_estoque, custo_por_ue, estoque_minimo_alerta, produto_final_id, tipo_insumo, created_at)
        VALUES (
          CASE WHEN v_org_text IS NULL OR v_org_text = '' THEN NULL ELSE v_org_text::uuid END,
          v_nome,
          v_unidade,
          v_unidade,
          v_custo,
          0,
          CASE WHEN v_prod_text IS NULL OR v_prod_text = '' THEN NULL ELSE v_prod_text::uuid END,
          'virtual', NOW()
        )
        ON CONFLICT (organization_id, nome) DO UPDATE
          SET custo_por_ue = EXCLUDED.custo_por_ue,
              produto_final_id = EXCLUDED.produto_final_id;
      ELSE
        INSERT INTO public.insumos (nome, unidade_medida, unidade_estoque, custo_por_ue, estoque_minimo_alerta, produto_final_id, tipo_insumo, created_at)
        VALUES (
          v_nome,
          v_unidade,
          v_unidade,
          v_custo,
          0,
          CASE WHEN v_prod_text IS NULL OR v_prod_text = '' THEN NULL ELSE v_prod_text::uuid END,
          'virtual', NOW()
        )
        ON CONFLICT (nome) DO UPDATE
          SET custo_por_ue = EXCLUDED.custo_por_ue,
              produto_final_id = EXCLUDED.produto_final_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS trg_sincronizar_semi_acabado ON public.produtos_finais;
CREATE TRIGGER trg_sincronizar_semi_acabado
AFTER INSERT OR UPDATE ON public.produtos_finais
FOR EACH ROW
EXECUTE FUNCTION public.fn_sincronizar_semi_acabado_insumo();

COMMIT;

-- End of 2026-02-17_update_fn_sincronizar_semi_acabado_insumo.sql


-- ============================================================================
-- 2) Dedupe e aplicar alterações (106_dedupe_and_apply_all.sql)
-- ============================================================================

-- Begin of 106_dedupe_and_apply_all.sql
-- Script consolidado: backup, listar duplicatas, dedupe, criar índice único, aplicar schema e backfills

BEGIN;

-- 1) Backup (dados)
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_configuracoes_sistema_chave_org
  ON public.configuracoes_sistema ((coalesce(organization_id::text, '__global__')), chave);

-- 5) Alterações de schema seguras (IF NOT EXISTS)
ALTER TABLE IF EXISTS public.locais ADD COLUMN IF NOT EXISTS dias_funcionamento smallint[];
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

-- End of 106_dedupe_and_apply_all.sql


-- ============================================================================
-- 3) Migrations de compatibilidade (colunas ausentes)
-- ============================================================================

-- Begin of 2026-02-17_add_preco_custo_produtos_finais.sql
ALTER TABLE IF EXISTS public.produtos_finais
  ADD COLUMN IF NOT EXISTS preco_custo numeric(14,2);

UPDATE public.produtos_finais SET preco_custo = 0 WHERE preco_custo IS NULL;

-- End of 2026-02-17_add_preco_custo_produtos_finais.sql


-- Begin of 2026-02-17_add_data_entrega_ordens_producao.sql
ALTER TABLE IF EXISTS public.ordens_producao
  ADD COLUMN IF NOT EXISTS data_entrega timestamptz;

-- End of 2026-02-17_add_data_entrega_ordens_producao.sql


-- Begin of 2026-02-17_add_forma_pagamento_vendas.sql
ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS forma_pagamento text;

-- End of 2026-02-17_add_forma_pagamento_vendas.sql


-- Begin of 2026-02-17_add_valor_total_itens_venda.sql
ALTER TABLE IF EXISTS public.itens_venda
  ADD COLUMN IF NOT EXISTS valor_total numeric
    GENERATED ALWAYS AS (COALESCE(subtotal, preco_unitario * quantidade)) STORED;

-- End of 2026-02-17_add_valor_total_itens_venda.sql


-- ============================================================================
-- 4) Backfill de metas (separado)
-- ============================================================================

-- Begin of 105_backfill_metas_vendas.sql
BEGIN;

-- 1) Calcular e popular meta_total por loja e mês
WITH monthly_totals AS (
  SELECT
    local_id,
    date_trunc('month', data_referencia)::date AS month_start,
    SUM(COALESCE(valor_meta, 0))::numeric(14,2) AS total
  FROM metas_vendas
  GROUP BY local_id, month_start
)
UPDATE metas_vendas mv
SET meta_total = mt.total
FROM monthly_totals mt
WHERE mv.local_id = mt.local_id
  AND date_trunc('month', mv.data_referencia)::date = mt.month_start;

-- 2) Popular dias_defuncionamento preferindo valor em `locais.dias_funcionamento` quando presente
UPDATE metas_vendas mv
SET dias_defuncionamento = COALESCE(
  (SELECT cardinality(l.dias_funcionamento) FROM locais l WHERE l.id = mv.local_id AND l.dias_funcionamento IS NOT NULL),
  (SELECT COUNT(*) FROM metas_vendas mv2 WHERE mv2.local_id = mv.local_id AND date_trunc('month', mv2.data_referencia) = date_trunc('month', mv.data_referencia) AND COALESCE(mv2.valor_meta,0) <> 0)
  )::integer
WHERE mv.dias_defuncionamento IS NULL;

COMMIT;

-- End of 105_backfill_metas_vendas.sql


-- ============================================================================
-- FIM do arquivo concatenado.
-- Recomendações finais:
-- - Cole e execute por blocos no Supabase para revisar SELECTs intermediários (especialmente a lista de duplicatas).
-- - Faça snapshot/backup do DB caso seu plano permita.
-- - Após aplicar, limpe caches do frontend e valide componentes que apresentavam 42703/400.
