-- Substitui políticas RLS problemáticas em public.estoque_produtos
-- Usa a coluna correta `policyname` na checagem de existência (pg_policies)
-- Execute no Supabase como usuário com privilégios.

-- Remover política monolítica se existir
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='estoque_produtos' AND policyname='SaaS Isolation Safe'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "SaaS Isolation Safe" ON public.estoque_produtos';
  END IF;
END $$;

-- Política de SELECT (USING)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='estoque_produtos' AND policyname='allow_org_select'
  ) THEN
    CREATE POLICY allow_org_select
      ON public.estoque_produtos
      FOR SELECT
      TO authenticated
      USING (
        organization_id IS NOT NULL
        AND organization_id = (current_setting('jwt.claims.organization_id', true))::uuid
      );
  END IF;
END $$;

-- Política de UPDATE/DELETE (USING + WITH CHECK para UPDATE)
-- Política de UPDATE (USING + WITH CHECK)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='estoque_produtos' AND policyname='allow_org_update'
  ) THEN
    CREATE POLICY allow_org_update
      ON public.estoque_produtos
      FOR UPDATE
      TO authenticated
      USING (
        organization_id IS NOT NULL
        AND organization_id = (current_setting('jwt.claims.organization_id', true))::uuid
      )
      WITH CHECK (
        organization_id IS NOT NULL
        AND organization_id = (current_setting('jwt.claims.organization_id', true))::uuid
      );
  END IF;
END $$;

-- Política de DELETE (USING)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='estoque_produtos' AND policyname='allow_org_delete'
  ) THEN
    CREATE POLICY allow_org_delete
      ON public.estoque_produtos
      FOR DELETE
      TO authenticated
      USING (
        organization_id IS NOT NULL
        AND organization_id = (current_setting('jwt.claims.organization_id', true))::uuid
      );
  END IF;
END $$;

-- Política de INSERT (WITH CHECK)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='estoque_produtos' AND policyname='allow_org_insert_authenticated'
  ) THEN
    CREATE POLICY allow_org_insert_authenticated
      ON public.estoque_produtos
      FOR INSERT
      TO authenticated
      WITH CHECK (
        organization_id IS NOT NULL
        AND organization_id = (current_setting('jwt.claims.organization_id', true))::uuid
      );
  END IF;
END $$;

-- Permitir inserts pelo service_role (funções internas)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='estoque_produtos' AND policyname='allow_service_inserts'
  ) THEN
    CREATE POLICY allow_service_inserts
      ON public.estoque_produtos
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- Exemplo de verificação (rode após aplicar):
-- SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='estoque_produtos';
