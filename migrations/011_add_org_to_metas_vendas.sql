-- Migration: adicionar organization_id em metas_vendas e backfill
-- Execute esta migration no banco (Supabase SQL editor)

BEGIN;

-- 1) adicionar coluna organization_id se não existir
ALTER TABLE metas_vendas ADD COLUMN IF NOT EXISTS organization_id UUID;

-- 2) popular organization_id a partir de locais.organization_id quando possível
UPDATE metas_vendas mv
SET organization_id = l.organization_id
FROM locais l
WHERE mv.local_id = l.id
  AND mv.organization_id IS NULL;

-- 3) criar índice para consultas por organization_id
CREATE INDEX IF NOT EXISTS idx_metas_vendas_organization_id ON metas_vendas(organization_id);

-- 4) opcional: adicionar constraint de foreign key se desejar (descomente)
-- ALTER TABLE metas_vendas
--   ADD CONSTRAINT fk_metas_vendas_organization
--   FOREIGN KEY (organization_id) REFERENCES organizations(id);

COMMIT;

-- Observações:
-- - Após aplicar, as consultas que filtram por organization_id passarão a funcionar.
-- - Se sua aplicação precisa garantir que novas linhas tenham organization_id,
--   considere adicionar um trigger que copie organization_id de locais ao inserir.
