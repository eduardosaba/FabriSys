-- Migration: 033_unique_categorias_lower
-- Purpose: Prevent case-insensitive duplicates in categorias.nome by creating
-- a unique index on lower(nome). This migration first checks for existing
-- case-insensitive duplicates and aborts with a helpful message if any are
-- found so the operator can resolve them before applying the index.

DO $$
DECLARE
  dup_count INTEGER;
  dup_list TEXT;
BEGIN
  -- Verify if any case-insensitive duplicates exist
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT lower(nome) as ln
    FROM categorias
    GROUP BY lower(nome)
    HAVING COUNT(*) > 1
  ) t;

  IF dup_count > 0 THEN
    -- Build a short list of duplicates for the error message
    SELECT string_agg(format('%s -> [%s]', ln, ids), E'\n') INTO dup_list
    FROM (
      SELECT lower(nome) as ln, array_to_string(array_agg(id), ',') as ids
      FROM categorias
      GROUP BY lower(nome)
      HAVING COUNT(*) > 1
    ) s;

    RAISE EXCEPTION 'Migration aborted: existem % rows com nomes duplicados (case-insensitive) em categorias. Resolva/mescle os registros antes de aplicar a migration. Duplicados:\n%s', dup_count, dup_list;
  END IF;

  -- Create unique index on lower(nome) if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_categorias_nome_lower'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_categorias_nome_lower ON categorias (lower(nome));';
  END IF;
END $$;
