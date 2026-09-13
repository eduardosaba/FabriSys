-- Migration: 20260913_fix_controle_user_access.sql
-- Vincula organization_id a todos os perfis/locais e libera leitura (SELECT) em produtos_finais e locais para todos os usuários autenticados.

DO $$
DECLARE
  v_main_org_id UUID;
BEGIN
  -- 1. Resgatar ID da organização principal
  SELECT id INTO v_main_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  IF v_main_org_id IS NULL THEN
    SELECT organization_id INTO v_main_org_id FROM public.locais WHERE organization_id IS NOT NULL LIMIT 1;
  END IF;

  -- 2. Atualizar perfis sem organization_id (ex: controle@larissasaba.com.br)
  IF v_main_org_id IS NOT NULL THEN
    UPDATE public.profiles
    SET organization_id = v_main_org_id
    WHERE organization_id IS NULL;

    UPDATE public.locais
    SET organization_id = v_main_org_id
    WHERE organization_id IS NULL;

    UPDATE public.produtos_finais
    SET organization_id = v_main_org_id
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- 3. Atualizar função handle_new_user para garantir organization_id em novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  BEGIN
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_org_id := NULL;
  END;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    BEGIN
      INSERT INTO public.profiles (id, role, nome, email, organization_id)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'role', 'express'),
        COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
        NEW.email,
        v_org_id
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.profiles (id, role, nome, email)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'role', 'express'),
        COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
        NEW.email
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Garantir que a tabela produtos_finais permite SELECT para todos os usuários autenticados
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'produtos_finais') THEN
    ALTER TABLE public.produtos_finais ENABLE ROW LEVEL SECURITY;
    
    -- Remover restrições antigas se existirem
    DROP POLICY IF EXISTS "produtos_finais_admin_fabrica" ON public.produtos_finais;
    DROP POLICY IF EXISTS "produtos_finais_pdv_select" ON public.produtos_finais;
    DROP POLICY IF EXISTS "produtos_finais_authenticated_select" ON public.produtos_finais;
    DROP POLICY IF EXISTS "allow_select_produtos_finais_all" ON public.produtos_finais;

    -- Política permissiva de SELECT para qualquer usuário logado no sistema
    CREATE POLICY allow_select_produtos_finais_all
      ON public.produtos_finais
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 5. Garantir que a tabela locais permite SELECT para todos os usuários autenticados
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'locais') THEN
    ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "select_locais" ON public.locais;
    DROP POLICY IF EXISTS "allow_select_locais_all" ON public.locais;

    CREATE POLICY allow_select_locais_all
      ON public.locais
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

GRANT SELECT ON public.produtos_finais TO authenticated;
GRANT SELECT ON public.locais TO authenticated;
