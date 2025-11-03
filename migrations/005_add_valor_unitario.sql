-- Adiciona coluna valor_unitario na tabela lotes_insumos
ALTER TABLE lotes_insumos ADD COLUMN IF NOT EXISTS valor_unitario numeric DEFAULT 0;