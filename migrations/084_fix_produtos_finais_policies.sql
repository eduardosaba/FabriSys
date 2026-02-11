-- Migration: 084_fix_produtos_finais_policies.sql
-- Corrige criação de policies para produtos_finais usando checagem condicional
-- para evitar uso de `CREATE POLICY IF NOT EXISTS` que gera erro de sintaxe

DO $$
BEGIN
  -- Política: admins e fábrica têm acesso completo (FOR ALL)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'produtos_finais' AND policyname = 'produtos_finais_admin_fabrica'
  ) THEN
    EXECUTE $$
      CREATE POLICY produtos_finais_admin_fabrica
        ON public.produtos_finais
        FOR ALL
        TO authenticated
        USING (auth.jwt() ->> 'role' IN ('admin','fabrica'))
        WITH CHECK (auth.jwt() ->> 'role' IN ('admin','fabrica'));
    $$;
  END IF;

  -- Política: pdv apenas SELECT em produtos ativos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'produtos_finais' AND policyname = 'produtos_finais_pdv_select'
  ) THEN
    EXECUTE $$
      CREATE POLICY produtos_finais_pdv_select
        ON public.produtos_finais
        FOR SELECT
        TO authenticated
        USING (auth.jwt() ->> 'role' = 'pdv' AND ativo = true);
    $$;
  END IF;

  -- Política: owner (created_by) pode atualizar seus próprios produtos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'produtos_finais' AND policyname = 'produtos_finais_owner_update'
  ) THEN
    EXECUTE $$
      CREATE POLICY produtos_finais_owner_update
        ON public.produtos_finais
        FOR UPDATE
        TO authenticated
        USING (created_by = auth.uid())
        WITH CHECK (created_by = auth.uid());
    $$;
  END IF;

  -- Política: permitir INSERT com checagem mínima
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'produtos_finais' AND policyname = 'produtos_finais_insert'
  ) THEN
    EXECUTE $$
      CREATE POLICY produtos_finais_insert
        ON public.produtos_finais
        FOR INSERT
        TO authenticated
        WITH CHECK (
          (auth.jwt() ->> 'role' IN ('admin','fabrica'))
          OR (organization_id::text = auth.jwt() ->> 'organization_id' AND created_by = auth.uid())
        );
    $$;
  END IF;
END
$$;

-- Observação: Esse script apenas cria policies quando não existem. Se você
-- quiser substituir políticas existentes, remova-as antes com DROP POLICY.
