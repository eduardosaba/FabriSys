-- Migration: 083_add_created_by_and_org_to_produtos_finais.sql
-- Adiciona colunas `created_by` e `organization_id` em produtos_finais
-- e permite que `preco_venda` seja NULL (opcional)

DO $$
BEGIN
  -- Verifica se a tabela existe
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'produtos_finais') THEN
    RAISE NOTICE 'Tabela produtos_finais não existe, pulando migration';
    RETURN;
  END IF;

  -- 1) Adicionar coluna created_by (UUID) se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'produtos_finais' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.produtos_finais ADD COLUMN created_by UUID;
    BEGIN
      -- Tenta criar FK para auth.users, ignora se não existir ou já estiver
      IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'users' AND pg_catalog.pg_namespace.nspname = 'auth') THEN
        ALTER TABLE public.produtos_finais
          ADD CONSTRAINT fk_produtos_finais_created_by
          FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'FK created_by não criada (provavelmente já existe ou auth.users ausente)';
    END;
  ELSE
    RAISE NOTICE 'coluna created_by já existe em produtos_finais';
  END IF;

  -- 2) Adicionar coluna organization_id (UUID) se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'produtos_finais' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.produtos_finais ADD COLUMN organization_id UUID;
    BEGIN
      -- Tenta criar FK para tabela organizations se existir
      IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organizations') THEN
        ALTER TABLE public.produtos_finais
          ADD CONSTRAINT fk_produtos_finais_organization_id
          FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'FK organization_id não criada (provavelmente já existe ou tabela organizations ausente)';
    END;
  ELSE
    RAISE NOTICE 'coluna organization_id já existe em produtos_finais';
  END IF;

  -- 3) Tornar preco_venda NULLABLE se atualmente NOT NULL
  PERFORM 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'produtos_finais' AND column_name = 'preco_venda' AND is_nullable = 'NO';
  IF FOUND THEN
    ALTER TABLE public.produtos_finais ALTER COLUMN preco_venda DROP NOT NULL;
    RAISE NOTICE 'Coluna preco_venda alterada para NULLABLE';
  ELSE
    RAISE NOTICE 'Coluna preco_venda já é NULLABLE ou não existe';
  END IF;

  -- 4) Índices úteis
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'produtos_finais' AND indexname = 'idx_produtos_finais_created_by') THEN
    CREATE INDEX idx_produtos_finais_created_by ON public.produtos_finais(created_by);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'produtos_finais' AND indexname = 'idx_produtos_finais_organization_id') THEN
    CREATE INDEX idx_produtos_finais_organization_id ON public.produtos_finais(organization_id);
  END IF;

END
$$;

COMMENT ON COLUMN public.produtos_finais.created_by IS 'Usuário que criou/alterou o registro (opcional)';
COMMENT ON COLUMN public.produtos_finais.organization_id IS 'Organização/tenant do produto (opcional)';
