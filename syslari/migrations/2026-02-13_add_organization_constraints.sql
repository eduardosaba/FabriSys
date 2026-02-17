-- Migration: adicionar organization_id, timestamps e índices/constraints
-- Objetivo: permitir upserts por organização ou por usuário para configurações e temas

BEGIN;

-- 1) configuracoes_sistema
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

-- Unique index que garante uma única configuração por (chave, organization) e também uma única configuração global (organization_id NULL)
-- Usamos coalesce(organization_id::text,'__global__') para tratar NULLs como um valor estável
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_configuracoes_sistema_chave_org
ON configuracoes_sistema ((coalesce(organization_id::text,'__global__')), chave);


-- 2) user_theme_colors
ALTER TABLE IF EXISTS user_theme_colors
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE IF EXISTS user_theme_colors
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS user_theme_colors
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Normaliza timestamps existentes
UPDATE user_theme_colors SET created_at = now() WHERE created_at IS NULL;
UPDATE user_theme_colors SET updated_at = now() WHERE updated_at IS NULL;

-- Index para pesquisa por organization
CREATE INDEX IF NOT EXISTS idx_user_theme_colors_organization ON user_theme_colors (organization_id);

-- Índices únicos parciais para suportar upserts por usuário OU por organização
-- Uma linha única por (user_id, theme_mode) quando user_id estiver presente
-- Remover duplicatas por (user_id, theme_mode), mantendo a versão mais recente
WITH dup_user AS (
  SELECT ctid, ROW_NUMBER() OVER (
    PARTITION BY user_id, theme_mode
    ORDER BY coalesce(updated_at, created_at) DESC
  ) AS rn
  FROM user_theme_colors
  WHERE user_id IS NOT NULL
)
DELETE FROM user_theme_colors WHERE ctid IN (SELECT ctid FROM dup_user WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_theme_colors_user_theme_mode
ON user_theme_colors (user_id, theme_mode)
WHERE user_id IS NOT NULL;

-- Remover duplicatas por (organization_id, theme_mode), mantendo a versão mais recente
WITH dup_org AS (
  SELECT ctid, ROW_NUMBER() OVER (
    PARTITION BY organization_id, theme_mode
    ORDER BY coalesce(updated_at, created_at) DESC
  ) AS rn
  FROM user_theme_colors
  WHERE organization_id IS NOT NULL
)
DELETE FROM user_theme_colors WHERE ctid IN (SELECT ctid FROM dup_org WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_theme_colors_org_theme_mode
ON user_theme_colors (organization_id, theme_mode)
WHERE organization_id IS NOT NULL;

COMMIT;

-- Observações:
-- - Essa migration não cria FKs para organizations por segurança (evita que falhe em ambientes sem tabela de orgs).
-- - Depois de aplicada, revise RLS/policies no Supabase para permitir inserts/updates nos escopos esperados.
