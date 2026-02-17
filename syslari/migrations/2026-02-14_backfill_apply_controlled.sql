-- Script: preview + apply controlled backfill for vendas.metodo_pagamento and vendas.total_venda
-- Autor: gerado automaticamente
-- Data: 2026-02-14

-- Uso recomendado:
-- 1) Rode as queries de PREVIEW para validar o que será atualizado.
-- 2) Ajuste o batch_size se quiser (padrão 500).
-- 3) Rode as seções APPLY (cada bloco fará updates em batches e fará NOTICE por lote).

-- ===================== PREVIEW: exemplos de vendas que seriam atualizadas =====================
-- 1) Preview metodo_pagamento a partir de public.pagamentos (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pagamentos') THEN
    RAISE NOTICE 'Tabela public.pagamentos existe. Rode a query de preview manualmente no SQL Editor para ver exemplos.';
    RAISE NOTICE 'Exemplo de query a rodar manualmente:\nSELECT ''pagamentos''::text AS source, l.venda_id, l.metodo FROM ( SELECT DISTINCT ON (p.venda_id) p.venda_id, COALESCE(p.metodo, p.method) AS metodo, COALESCE(p.created_at, p."created_at") AS ts FROM public.pagamentos p ORDER BY p.venda_id, ts DESC ) l JOIN public.vendas v ON v.id = l.venda_id WHERE v.metodo_pagamento IS NULL AND l.metodo IS NOT NULL LIMIT 20;';
  ELSE
    RAISE NOTICE 'Tabela public.pagamentos não existe. Pulando preview de exemplos para pagamentos.';
  END IF;
END$$;

-- 2) Preview metodo_pagamento a partir de public.payments (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payments') THEN
    RAISE NOTICE 'Tabela public.payments existe. Rode a query de preview manualmente no SQL Editor para ver exemplos.';
    RAISE NOTICE 'Exemplo de query a rodar manualmente:\nSELECT ''payments''::text AS source, l.venda_id, l.metodo FROM ( SELECT DISTINCT ON (p.venda_id) p.venda_id, COALESCE(p.metodo, p.method) AS metodo, COALESCE(p.created_at, p."created_at") AS ts FROM public.payments p ORDER BY p.venda_id, ts DESC ) l JOIN public.vendas v ON v.id = l.venda_id WHERE v.metodo_pagamento IS NULL AND l.metodo IS NOT NULL LIMIT 20;';
  ELSE
    RAISE NOTICE 'Tabela public.payments não existe. Pulando preview de exemplos para payments.';
  END IF;
END$$;

-- 3) Preview total_venda a partir de itens_venda (se existir)
SELECT v.id AS venda_id, s.sum_total
FROM (
  SELECT venda_id, COALESCE(SUM(subtotal),0)::numeric(12,2) AS sum_total
  FROM public.itens_venda
  GROUP BY venda_id
) s
JOIN public.vendas v ON v.id = s.venda_id
WHERE (v.total_venda IS NULL OR v.total_venda = 0) AND s.sum_total IS NOT NULL
ORDER BY s.sum_total DESC
LIMIT 20;

-- ===================== APPLY: backfill metodo_pagamento (batches) =====================
-- Ajuste batch_size conforme necessário
DO $$
DECLARE
  batch_size integer := 500;
  updated integer := 0;
  sql text;
  src text;
BEGIN
  -- Tenta usar 'pagamentos' primeiro, senão 'payments', senão pula
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pagamentos') THEN
    src := 'pagamentos';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payments') THEN
    src := 'payments';
  ELSE
    RAISE NOTICE 'Nenhuma tabela pagamentos/payments encontrada. Pulando backfill metodo_pagamento.';
    RETURN;
  END IF;

  RAISE NOTICE 'Usando tabela % para backfill de metodo_pagamento', src;

  LOOP
    -- Construir SQL dinâmico que seleciona latest methods e limita a batch
    sql := format($f$
      WITH latest AS (
        SELECT DISTINCT ON (p.venda_id) p.venda_id, COALESCE(p.metodo, p.method) AS metodo,
               COALESCE(p.created_at, p."created_at") AS ts
        FROM public.%I p
        ORDER BY p.venda_id, ts DESC
      ), to_update AS (
        SELECT l.venda_id, l.metodo
        FROM latest l
        JOIN public.vendas v ON v.id = l.venda_id
        WHERE v.metodo_pagamento IS NULL AND l.metodo IS NOT NULL
        LIMIT %s
      )
      UPDATE public.vendas v
      SET metodo_pagamento = t.metodo
      FROM to_update t
      WHERE v.id = t.venda_id;
    $f$, src, batch_size);

    EXECUTE sql;
    GET DIAGNOSTICS updated = ROW_COUNT;
    RAISE NOTICE 'metodo_pagamento: updated % rows in this batch', updated;
    EXIT WHEN updated = 0;
  END LOOP;
END$$;

-- ===================== APPLY: backfill total_venda (batches) =====================
DO $$
DECLARE
  batch_size integer := 500;
  updated integer := 0;
  sql text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='itens_venda') THEN
    RAISE NOTICE 'Tabela itens_venda não existe. Pulando backfill total_venda.';
    RETURN;
  END IF;

  LOOP
    sql := format($f$
      WITH sums AS (
        SELECT venda_id, COALESCE(SUM(subtotal),0)::numeric(12,2) AS sum_total
        FROM public.itens_venda
        GROUP BY venda_id
      ), to_update AS (
        SELECT s.venda_id, s.sum_total
        FROM sums s
        JOIN public.vendas v ON v.id = s.venda_id
        WHERE (v.total_venda IS NULL OR v.total_venda = 0) AND s.sum_total IS NOT NULL
        LIMIT %s
      )
      UPDATE public.vendas v
      SET total_venda = t.sum_total
      FROM to_update t
      WHERE v.id = t.venda_id;
    $f$, batch_size);

    EXECUTE sql;
    GET DIAGNOSTICS updated = ROW_COUNT;
    RAISE NOTICE 'total_venda: updated % rows in this batch', updated;
    EXIT WHEN updated = 0;
  END LOOP;
END$$;

-- ===================== FIM =====================
