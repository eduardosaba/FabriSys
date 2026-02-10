-- Migration: 060_add_org_created_by_to_categorias.sql
-- Purpose: add `organization_id` (UUID) and `created_by` (UUID) to `categorias` table,
-- create FK constraints and indexes. Idempotent and safe for staging/production.

BEGIN;

-- Safety: ensure categorias exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'categorias'
  ) THEN
    RAISE EXCEPTION 'Table public.categorias does not exist; aborting migration';
  END IF;
END$$;

-- Add organization_id UUID referencing organizations(id) if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='categorias' AND column_name='organization_id'
  ) THEN
    -- Add nullable UUID FK; existing rows remain NULL
    ALTER TABLE public.categorias
      ADD COLUMN organization_id UUID;

    -- If organizations table exists, add FK constraint
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='organizations') THEN
      ALTER TABLE public.categorias
        ADD CONSTRAINT fk_categorias_organization_id
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added categorias.organization_id and FK to organizations(id)';
    ELSE
      RAISE NOTICE 'Added categorias.organization_id (organizations table not present, no FK created)';
    END IF;
  ELSE
    RAISE NOTICE 'categorias.organization_id already exists';
  END IF;
END$$;

-- Add created_by UUID referencing auth.users(id) if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='categorias' AND column_name='created_by'
  ) THEN
    ALTER TABLE public.categorias
      ADD COLUMN created_by UUID;

    -- Add FK to auth.users if the schema exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='users') THEN
      ALTER TABLE public.categorias
        ADD CONSTRAINT fk_categorias_created_by
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added categorias.created_by and FK to auth.users(id)';
    ELSE
      RAISE NOTICE 'Added categorias.created_by (auth.users not present, no FK created)';
    END IF;
  ELSE
    RAISE NOTICE 'categorias.created_by already exists';
  END IF;
END$$;

-- Indexes to speed up queries
CREATE INDEX IF NOT EXISTS idx_categorias_organization_id ON public.categorias (organization_id);
CREATE INDEX IF NOT EXISTS idx_categorias_created_by ON public.categorias (created_by);

COMMIT;

/*
Notes:
- Run this in staging first and backup production before applying.
- After applying, PostgREST (Supabase REST) may still return PGRST204 until its
  schema cache refreshes. If you see PGRST204 after running the migration,
  either wait a few seconds or restart the Supabase REST server (or reload DB
  in the Supabase console). In many hosted setups the cache invalidates shortly
  after DDL, but sometimes a manual restart is needed.
- If you want these columns to be NOT NULL for new data, add a separate migration
  later to populate and enforce NOT NULL after you populate historical rows.
*/
