-- Migration: backfill metodo_pagamento em vendas a partir de tabela payments/pagamentos
-- Autor: gerado automaticamente
-- Data: 2026-02-14

-- Esta migration verifica se existe uma tabela `pagamentos` (ou `payments`) com
-- campos usuais (`venda_id`, `metodo` ou `method`, `created_at`) e, se existir,
-- preenche `vendas.metodo_pagamento` com o último método de pagamento associado à venda.
-- A operação é idempotente: apenas atualiza linhas onde metodo_pagamento IS NULL.

BEGIN;

DO $$
DECLARE
  tbl_exists boolean;
  col_venda text := NULL;
BEGIN
  -- Verifica se a tabela pagamentos existe (pt-BR) e tem as colunas esperadas
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'pagamentos'
  ) INTO tbl_exists;

  IF tbl_exists THEN
    RAISE NOTICE 'Tabela "pagamentos" encontrada: realizando backfill a partir dela.';
    -- Checar colunas e escolher os nomes de coluna corretos
    IF EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = 'pagamentos' AND c.column_name = 'venda_id'
    ) THEN
      col_venda := 'venda_id';
    ELSE
      col_venda := NULL;
    END IF;

    IF col_venda IS NOT NULL AND EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = 'pagamentos' AND c.column_name IN ('metodo','method')
    ) THEN
      -- Insere o metodo mais recente por venda
      WITH latest AS (
        SELECT DISTINCT ON (p."venda_id") p."venda_id" as venda_id,
          COALESCE(p.metodo, p.method) as metodo
        FROM public.pagamentos p
        ORDER BY p."venda_id", COALESCE(p.created_at, p."created_at") DESC NULLS LAST
      )
      UPDATE public.vendas v
      SET metodo_pagamento = l.metodo
      FROM latest l
      WHERE v.id = l.venda_id AND v.metodo_pagamento IS NULL AND l.metodo IS NOT NULL;
    ELSE
      RAISE NOTICE 'Tabela pagamentos encontrada, mas colunas esperadas não existem. Pulando.';
    END IF;
  ELSE
    -- Tentar tabela com nome em inglês 'payments'
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_name = 'payments'
    ) INTO tbl_exists;

    IF tbl_exists THEN
      RAISE NOTICE 'Tabela "payments" encontrada: realizando backfill a partir dela.';
      IF EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = 'payments' AND c.column_name = 'venda_id'
      ) THEN
        col_venda := 'venda_id';
      ELSE
        col_venda := NULL;
      END IF;

      IF col_venda IS NOT NULL AND EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = 'payments' AND c.column_name IN ('metodo','method')
      ) THEN
        WITH latest AS (
          SELECT DISTINCT ON (p."venda_id") p."venda_id" as venda_id,
            COALESCE(p.metodo, p.method) as metodo
          FROM public.payments p
          ORDER BY p."venda_id", COALESCE(p.created_at, p."created_at") DESC NULLS LAST
        )
        UPDATE public.vendas v
        SET metodo_pagamento = l.metodo
        FROM latest l
        WHERE v.id = l.venda_id AND v.metodo_pagamento IS NULL AND l.metodo IS NOT NULL;
      ELSE
        RAISE NOTICE 'Tabela payments encontrada, mas colunas esperadas não existem. Pulando.';
      END IF;
    ELSE
      RAISE NOTICE 'Nenhuma tabela de pagamentos encontrada (pagamentos/payments). Pulando backfill.';
    END IF;
  END IF;
END$$;

COMMIT;

-- Observação: rollback manual possível definindo metodo_pagamento = NULL para as linhas atualizadas,
-- mas só execute se tiver certeza do impacto.
