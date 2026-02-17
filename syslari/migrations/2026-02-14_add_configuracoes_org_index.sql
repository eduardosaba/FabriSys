-- Migration: criar índice único por (coalesce(organization_id::text,'__global__'), chave)
-- Objetivo: permitir upserts por organização ou global (organization_id NULL) usando uma chave estável

BEGIN;

-- 1) garante colunas essenciais
ALTER TABLE IF EXISTS configuracoes_sistema
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE IF EXISTS configuracoes_sistema
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS configuracoes_sistema
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Normaliza timestamps existentes
UPDATE configuracoes_sistema SET created_at = now() WHERE created_at IS NULL;
UPDATE configuracoes_sistema SET updated_at = now() WHERE updated_at IS NULL;

-- Index para pesquisa por organization
CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_organization ON configuracoes_sistema (organization_id);

-- Remover duplicatas existentes mantendo a versão mais recente (por updated_at/created_at)
WITH duplicates AS (
  SELECT ctid, ROW_NUMBER() OVER (
    PARTITION BY coalesce(organization_id::text,'__global__'), chave
    ORDER BY coalesce(updated_at, created_at) DESC
  ) AS rn
  FROM configuracoes_sistema
)
DELETE FROM configuracoes_sistema
WHERE ctid IN (SELECT ctid FROM duplicates WHERE rn > 1);

-- Criar índice único que trata NULL organization_id como "__global__" para permitir
-- um único registro por (organization OR global) e por chave.
CREATE UNIQUE INDEX IF NOT EXISTS uq_configuracoes_sistema_chave_org
ON configuracoes_sistema ((coalesce(organization_id::text,'__global__')), chave);

COMMIT;

-- Observação:
-- Após aplicar esta migration, scripts que utilizam UPSERT por organização podem
-- usar um ON CONFLICT apropriado. Se preferir aplicar a dedupe e o índice em outro
-- horário, execute manualmente no SQL editor do Supabase (faça backup antes).
