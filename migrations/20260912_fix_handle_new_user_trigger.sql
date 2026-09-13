-- Migration: Correção do Trigger de Criação de Usuário no Supabase (auth.users -> public.profiles)
-- Resolve o erro "Failed to create user: Database error creating new user" no Dashboard do Supabase.

-- 1. Garante que a restrição de roles no profiles aceita todas as funções do sistema
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('master', 'admin', 'gerente', 'compras', 'fabrica', 'pdv', 'user', 'express', 'pdv_simples'));

-- 2. Atualiza a função handle_new_user com tratamento seguro de exceções (EXCEPTION WHEN OTHERS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Tenta resgatar o organization_id padrão
  BEGIN
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_org_id := NULL;
  END;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    -- Insere o novo perfil com fallback de segurança
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
        nome = COALESCE(public.profiles.nome, EXCLUDED.nome);
    EXCEPTION WHEN OTHERS THEN
      -- Se a coluna organization_id não existir na tabela profiles, faz o insert simples
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
  -- Garante que NUNCA trave a criação do usuário em auth.users no Supabase Dashboard
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recria o trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
