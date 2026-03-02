-- 018_add_op_pai_id_ordens_producao.sql
-- Adiciona coluna opcional op_pai_id para vincular OPs filhas a OP pai (semi-acabado)

ALTER TABLE IF EXISTS ordens_producao
  ADD COLUMN IF NOT EXISTS op_pai_id UUID NULL REFERENCES ordens_producao(id) ON DELETE SET NULL;

-- Índice para consultas por op_pai_id
CREATE INDEX IF NOT EXISTS idx_ordens_producao_op_pai_id ON ordens_producao(op_pai_id);
