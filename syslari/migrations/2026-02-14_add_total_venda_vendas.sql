-- Migration: adicionar coluna total_venda em vendas + backfill
-- Autor: gerado automaticamente
-- Data: 2026-02-14

-- Observações:
-- 1) Adiciona a coluna `total_venda` como numeric(12,2) com default 0 para compatibilidade
-- 2) Backfill: se existir `itens_venda`, preenche total_venda com SUM(subtotal) por venda
-- 3) Operações idempotentes: usa IF NOT EXISTS / WHERE v.total_venda IS NULL OR = 0

BEGIN;

-- 1) Adiciona coluna (com DEFAULT 0 para não quebrar inserts existentes)
ALTER TABLE public.vendas
ADD COLUMN IF NOT EXISTS total_venda numeric(12,2) DEFAULT 0;

-- 2) Comentário para documentação
COMMENT ON COLUMN public.vendas.total_venda IS 'Total da venda (soma dos subtotais dos itens)';

-- 3) Backfill (se houver tabela de itens_venda)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'itens_venda'
  ) THEN
    RAISE NOTICE 'itens_venda encontrada: realizando backfill de total_venda (apenas para total_venda IS NULL/0).';

    WITH sums AS (
      SELECT venda_id, COALESCE(SUM(subtotal),0)::numeric(12,2) AS sum_total
      FROM public.itens_venda
      GROUP BY venda_id
    )
    UPDATE public.vendas v
    SET total_venda = s.sum_total
    FROM sums s
    WHERE v.id = s.venda_id AND (v.total_venda IS NULL OR v.total_venda = 0) AND s.sum_total IS NOT NULL;
  ELSE
    RAISE NOTICE 'Tabela itens_venda não encontrada: pulando backfill de total_venda.';
  END IF;
END$$;

COMMIT;

-- Rollback (manualmente executável se necessário):
-- ALTER TABLE public.vendas DROP COLUMN IF EXISTS total_venda;
