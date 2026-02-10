-- 062_add_org_created_by_to_locais.sql
-- Adiciona colunas organization_id e created_by em locais e políticas RLS idempotentes
-- Executar em staging antes de production. Backup recomendado.

DO $$
BEGIN
  -- 1) Adicionar coluna organization_id (UUID) se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'locais' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.locais ADD COLUMN organization_id uuid;
  END IF;

  -- 2) Adicionar coluna created_by (UUID) se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'locais' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.locais ADD COLUMN created_by uuid;
  END IF;
END$$;

-- Criar FKs/índices se as tabelas existirem
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'organizations') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_locais_organization_id'
    ) THEN
      ALTER TABLE public.locais
        ADD CONSTRAINT fk_locais_organization_id FOREIGN KEY (organization_id)
        REFERENCES public.organizations(id) ON DELETE SET NULL;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'auth') OR EXISTS (SELECT 1 FROM pg_class WHERE relname = 'users') THEN
    -- Tentativa de criar FK para auth.users se existir
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_locais_created_by'
    ) THEN
      BEGIN
        ALTER TABLE public.locais
          ADD CONSTRAINT fk_locais_created_by FOREIGN KEY (created_by)
          REFERENCES auth.users(id) ON DELETE SET NULL;
      EXCEPTION WHEN undefined_table THEN
        -- fallback: não cria se schema auth.users não existir
        RAISE NOTICE 'auth.users não encontrado; pulando FK created_by';
      END;
    END IF;
  END IF;
END$$;

-- Índices para consultas por organização/created_by
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_locais_organization_id') THEN
    CREATE INDEX IF NOT EXISTS idx_locais_organization_id ON public.locais (organization_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_locais_created_by') THEN
    CREATE INDEX IF NOT EXISTS idx_locais_created_by ON public.locais (created_by);
  END IF;
END$$;

-- --- RLS: criar políticas explícitas (idempotente)
-- Remove policy genérica se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'locais' AND p.polname = 'manage_locais'
  ) THEN
    ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
    PERFORM pg_catalog.pg_policy_drop('manage_locais', 'public', 'locais');
  END IF;
EXCEPTION WHEN undefined_function THEN
  -- ignore if pg_policy manipulation function not available
  NULL;
END$$;

BEGIN;
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'locais' AND p.polname = 'select_locais'
  ) THEN
    CREATE POLICY select_locais ON public.locais FOR SELECT USING (
      (
        (organization_id IS NULL) OR (organization_id = current_setting('jwt.claims.organization_id', true)::uuid)
      ) OR (created_by = auth.uid())
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'locais' AND p.polname = 'insert_locais'
  ) THEN
    CREATE POLICY insert_locais ON public.locais FOR INSERT WITH CHECK (
      (created_by = auth.uid()) OR (organization_id = current_setting('jwt.claims.organization_id', true)::uuid)
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'locais' AND p.polname = 'update_locais'
  ) THEN
    CREATE POLICY update_locais ON public.locais FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'locais' AND p.polname = 'delete_locais'
  ) THEN
    CREATE POLICY delete_locais ON public.locais FOR DELETE USING (created_by = auth.uid());
  END IF;
END$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.locais TO authenticated;

COMMIT;

-- Nota: se seu JWT usa outra claim para organization_id ajuste current_setting() acima.
