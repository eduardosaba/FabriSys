-- Migration: 059_add_categoria_to_produtos_finais.sql
-- Purpose: add `categoria_id` column to `produtos_finais` (BIGINT), create
-- a foreign-key constraint to `categorias(id)` and an index for performance.
-- This migration is idempotent and performs checks before applying DDL.

BEGIN;

-- Safety: ensure target table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'produtos_finais'
  ) THEN
    RAISE EXCEPTION 'Table public.produtos_finais does not exist; aborting migration';
  END IF;
END$$;

-- If column exists, verify type; otherwise add it
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'produtos_finais' AND column_name = 'categoria_id';

  IF col_type IS NULL THEN
    ALTER TABLE public.produtos_finais
      ADD COLUMN categoria_id BIGINT;
    RAISE NOTICE 'Added column produtos_finais.categoria_id BIGINT';
  ELSE
    IF lower(col_type) <> 'bigint' THEN
      RAISE EXCEPTION 'Column produtos_finais.categoria_id already exists with type % - manual migration required', col_type;
    ELSE
      RAISE NOTICE 'Column produtos_finais.categoria_id already exists and is BIGINT';
    END IF;
  END IF;
END$$;

-- Create FK constraint only if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'produtos_finais' AND c.conname = 'fk_produtos_finais_categoria_id'
  ) THEN
    -- Create foreign key with ON DELETE SET NULL to avoid blocking deletes
    ALTER TABLE public.produtos_finais
      ADD CONSTRAINT fk_produtos_finais_categoria_id
      FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added FK constraint fk_produtos_finais_categoria_id -> categorias(id)';
  ELSE
    RAISE NOTICE 'FK constraint fk_produtos_finais_categoria_id already exists';
  END IF;
END$$;

-- Create index for faster joins/filters
CREATE INDEX IF NOT EXISTS idx_produtos_finais_categoria_id
  ON public.produtos_finais (categoria_id);

COMMIT;

/*
Usage notes:
- Run this in a safe environment (staging) first.
- Backup your DB before applying to production.
- If the migration aborts due to an existing column with a different type,
  inspect the column and convert using an appropriate `USING` clause, for example:

  ALTER TABLE public.produtos_finais
    ALTER COLUMN categoria_id TYPE BIGINT USING categoria_id::bigint;

- Consider running `repopulate_categorias.sql` if you have a way to map existing
  product rows to categories by name or heuristics.

RLS / policies:
- This migration only adds schema objects. If you have RLS policies that reference
  specific column lists for SELECT/INSERT/UPDATE on `produtos_finais`, review them
  to ensure they still work (generally they will).
*/
