-- 2026-02-17_fix_valor_total_itens_venda.sql
-- Corrige registros com valor_total NULL em itens_venda sem assumir coluna updated_at
-- Procedimento seguro para staging: 1) preencher subtotal quando possível 2) recriar/garantir coluna GENERATED

BEGIN;

-- 1) Preencher subtotal onde for possível a partir de preco_unitario * quantidade
UPDATE public.itens_venda
SET subtotal = COALESCE(subtotal, preco_unitario * quantidade)
WHERE valor_total IS NULL
  AND preco_unitario IS NOT NULL
  AND quantidade IS NOT NULL;

-- 2) Garantir/executar ação sobre a coluna valor_total
DO $$
DECLARE
  v_is_generated text;
  v_null_cnt bigint;
BEGIN
  SELECT is_generated INTO v_is_generated
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'itens_venda' AND column_name = 'valor_total';

  IF v_is_generated IS NULL THEN
    RAISE NOTICE 'valor_total não existe: criando coluna GENERATED.';
    EXECUTE 'ALTER TABLE public.itens_venda ADD COLUMN valor_total numeric GENERATED ALWAYS AS (COALESCE(subtotal, preco_unitario * quantidade)) STORED';

  ELSIF v_is_generated = 'NEVER' THEN
    RAISE NOTICE 'valor_total existe e não é gerada: recriando como GENERATED.';
    EXECUTE 'ALTER TABLE public.itens_venda DROP COLUMN IF EXISTS valor_total';
    EXECUTE 'ALTER TABLE public.itens_venda ADD COLUMN valor_total numeric GENERATED ALWAYS AS (COALESCE(subtotal, preco_unitario * quantidade)) STORED';

  ELSE
    SELECT COUNT(*) INTO v_null_cnt FROM public.itens_venda WHERE valor_total IS NULL;
    IF v_null_cnt > 0 THEN
      RAISE NOTICE 'valor_total é GENERATED mas % linhas estão NULL: recriando a coluna para recomputar.', v_null_cnt;
      EXECUTE 'ALTER TABLE public.itens_venda DROP COLUMN IF EXISTS valor_total';
      EXECUTE 'ALTER TABLE public.itens_venda ADD COLUMN valor_total numeric GENERATED ALWAYS AS (COALESCE(subtotal, preco_unitario * quantidade)) STORED';
    ELSE
      RAISE NOTICE 'valor_total é GENERATED e não há NULLs; nenhuma ação necessária.';
    END IF;
  END IF;
END$$;

COMMIT;

-- Recomendações pós-migration (execute manualmente para validação):
-- SELECT COUNT(*) FROM public.itens_venda WHERE valor_total IS NULL;
-- SELECT id, preco_unitario, quantidade, subtotal, valor_total FROM public.itens_venda WHERE valor_total IS NULL LIMIT 50;
