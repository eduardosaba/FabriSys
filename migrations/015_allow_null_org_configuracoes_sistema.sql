-- Migration: 015_allow_null_org_configuracoes_sistema.sql
-- Permite que a coluna organization_id em configuracoes_sistema seja NULL
-- e garante índice único coerente para upserts globais/por-org

BEGIN;

-- Backup rápido (não destrutivo)
CREATE TABLE IF NOT EXISTS backup_configuracoes_sistema AS TABLE public.configuracoes_sistema WITH DATA;

-- Assegura extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Se `organization_id` estiver na PK, atualiza a PK para usar uma coluna `id` (uuid)
DO $$
DECLARE
  pk_name text;
  has_id_col boolean;
BEGIN
  SELECT tc.constraint_name INTO pk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'configuracoes_sistema'
    AND tc.constraint_type = 'PRIMARY KEY'
    AND kcu.column_name = 'organization_id'
  LIMIT 1;

  IF pk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.configuracoes_sistema DROP CONSTRAINT %I', pk_name);

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'configuracoes_sistema' AND column_name = 'id'
    ) INTO has_id_col;

    IF NOT has_id_col THEN
      EXECUTE 'ALTER TABLE public.configuracoes_sistema ADD COLUMN id uuid DEFAULT gen_random_uuid()';
    END IF;

    -- Define `id` como PK
    EXECUTE 'ALTER TABLE public.configuracoes_sistema ADD CONSTRAINT pk_configuracoes_sistema PRIMARY KEY (id)';
  END IF;
END$$;

-- Agora é seguro permitir NULL em organization_id (se ainda não for NULLable)
ALTER TABLE IF EXISTS public.configuracoes_sistema
  ALTER COLUMN organization_id DROP NOT NULL;

-- Garante índice único que considera global vs org (coalesce)
CREATE UNIQUE INDEX IF NOT EXISTS uq_configuracoes_sistema_chave_org
  ON public.configuracoes_sistema ((coalesce(organization_id::text,'__global__')), chave);

COMMIT;

-- Verificação sugerida:
-- SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'configuracoes_sistema';
