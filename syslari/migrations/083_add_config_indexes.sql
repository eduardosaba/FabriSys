-- Migration: 083_add_config_indexes.sql
-- Objetivo: adicionar colunas UTC/timestamps, remover duplicatas e criar índices únicos
-- Atenção: execute em transaction e faça backup antes (veja README_apply_organization_migration.md)

BEGIN;

-- 1) configuracoes_sistema: colunas e dedupe
ALTER TABLE IF EXISTS configuracoes_sistema
  ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE IF EXISTS configuracoes_sistema
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS configuracoes_sistema
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
UPDATE configuracoes_sistema SET created_at = now() WHERE created_at IS NULL;
UPDATE configuracoes_sistema SET updated_at = now() WHERE updated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_organization ON configuracoes_sistema (organization_id);

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

-- 2) user_theme_colors: colunas e dedupe
ALTER TABLE IF EXISTS user_theme_colors
  ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE IF EXISTS user_theme_colors
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS user_theme_colors
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
UPDATE user_theme_colors SET created_at = now() WHERE created_at IS NULL;
UPDATE user_theme_colors SET updated_at = now() WHERE updated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_theme_colors_organization ON user_theme_colors (organization_id);

-- Remover duplicatas por (user_id, theme_mode)
WITH dup_user AS (
  SELECT ctid, ROW_NUMBER() OVER (
    PARTITION BY user_id, theme_mode
    ORDER BY coalesce(updated_at, created_at) DESC
  ) AS rn
  FROM user_theme_colors
  WHERE user_id IS NOT NULL
)
DELETE FROM user_theme_colors WHERE ctid IN (SELECT ctid FROM dup_user WHERE rn > 1);

-- Remover duplicatas por (organization_id, theme_mode)
WITH dup_org AS (
  SELECT ctid, ROW_NUMBER() OVER (
    PARTITION BY organization_id, theme_mode
    ORDER BY coalesce(updated_at, created_at) DESC
  ) AS rn| schemaname | tablename             | policyname                                          | permissive | roles           | cmd    | qual                                                                                                       | with_check                                                                                                 |
| ---------- | --------------------- | --------------------------------------------------- | ---------- | --------------- | ------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| public     | configuracoes_sistema | Politica de Configuracoes                           | PERMISSIVE | {authenticated} | ALL    | (organization_id = ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))) | (organization_id = ( SELECT profiles.organization_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))) |
| public     | configuracoes_sistema | SaaS Isolation Safe                                 | PERMISSIVE | {public}        | ALL    | ((organization_id = get_my_org()) OR (get_my_role() = 'master'::text))                                     | null                                                                                                       |
| public     | configuracoes_sistema | allow_authenticated_insert_on_configuracoes_sistema | PERMISSIVE | {public}        | INSERT | null                                                                                                       | (auth.role() = 'authenticated'::text)                                                                      |
| public     | configuracoes_sistema | allow_authenticated_update_on_configuracoes_sistema | PERMISSIVE | {public}        | UPDATE | (auth.role() = 'authenticated'::text)                                                                      | (auth.role() = 'authenticated'::text)                                                                      |
  FROM user_theme_colors
  WHERE organization_id IS NOT NULL
)
DELETE FROM user_theme_colors WHERE ctid IN (SELECT ctid FROM dup_org WHERE rn > 1);

-- Garantir índice ÚNICO que o ON CONFLICT possa usar (não-parcial)
DROP INDEX IF EXISTS uq_user_theme_colors_org_theme_mode;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_theme_colors_org_theme_mode
  ON user_theme_colors (organization_id, theme_mode);

-- Mantemos também o índice por user (parcial) já criado anteriormente
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_theme_colors_user_theme_mode
  ON user_theme_colors (user_id, theme_mode)
  WHERE user_id IS NOT NULL;

COMMIT;

-- Observação: execute este arquivo em staging primeiro. Faça backup completo antes.
