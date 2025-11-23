-- Migração: 054_add_lote_validade_movimentacao.sql
-- Adiciona colunas `lote` (text) e `validade` (date) em `movimentacao_estoque`.
-- Ajuste: esse arquivo é idempotente (usa IF NOT EXISTS onde aplicável).

BEGIN;

-- 1) Adiciona colunas
ALTER TABLE public.movimentacao_estoque
    ADD COLUMN IF NOT EXISTS lote text;

ALTER TABLE public.movimentacao_estoque
    ADD COLUMN IF NOT EXISTS validade date;

-- 2) Opcional: criar índice em `validade` para consultas de alertas/expiração
-- Em tabelas grandes, prefira criar o índice CONCURRENTLY manualmente (fora de transação).
CREATE INDEX IF NOT EXISTS idx_movimentacao_estoque_validade ON public.movimentacao_estoque (validade);

COMMIT;
