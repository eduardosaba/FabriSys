-- Migration de compatibilidade: adiciona coluna quantidade_enviada_extra em ordens_producao
ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS quantidade_enviada_extra INTEGER DEFAULT 0;

-- Garante também estoque_seguranca existe
ALTER TABLE ordens_producao ADD COLUMN IF NOT EXISTS estoque_seguranca INTEGER DEFAULT 0;
