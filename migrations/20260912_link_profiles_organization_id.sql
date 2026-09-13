-- Migration: Vincula perfis sem organization_id à organização principal do sistema
-- Garante que novos usuários (ex: controle@larissasaba.com.br) recebam automaticamente o id da organização.

DO $$
DECLARE
  v_main_org_id UUID;
BEGIN
  -- 1. Resgata a primeira organização cadastrada no banco de dados
  SELECT id INTO v_main_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;

  -- Se não existir em public.organizations, busca de public.locais
  IF v_main_org_id IS NULL THEN
    SELECT organization_id INTO v_main_org_id FROM public.locais WHERE organization_id IS NOT NULL LIMIT 1;
  END IF;

  -- 2. Atualiza todos os perfis com organization_id nulo
  IF v_main_org_id IS NOT NULL THEN
    UPDATE public.profiles
    SET organization_id = v_main_org_id
    WHERE organization_id IS NULL;

    -- Garantir que os locais também tenham a organização vinculada
    UPDATE public.locais
    SET organization_id = v_main_org_id
    WHERE organization_id IS NULL;
  END IF;
END $$;
