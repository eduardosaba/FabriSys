-- Migration: Preservação da Taxa Financeira Única no Fechamento Unificado
-- Data: 2026-09-30
-- Adiciona colunas para armazenamento de taxas operacionais e total líquido após taxas
-- Idempotente e segura: preserva registros históricos e não sobrescreve valores existentes

ALTER TABLE public.fechamentos_unificados_pdv
  ADD COLUMN IF NOT EXISTS total_taxas_operacionais NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_liquido_apos_taxas NUMERIC(14,2) NOT NULL DEFAULT 0.00;

-- Atualizar registros históricos existentes (se houver) para garantir consistência
UPDATE public.fechamentos_unificados_pdv
SET total_liquido_apos_taxas = total_recebido
WHERE total_liquido_apos_taxas = 0.00 AND total_recebido > 0.00;

COMMENT ON COLUMN public.fechamentos_unificados_pdv.total_taxas_operacionais IS 'Soma única em R$ de todas as taxas descontadas nas operações digitais do dia (Pix + cartões). Não reduz as vendas comerciais.';
COMMENT ON COLUMN public.fechamentos_unificados_pdv.total_liquido_apos_taxas IS 'Total líquido efetivamente recebido após o desconto das taxas operacionais (total_recebido - total_taxas_operacionais).';
