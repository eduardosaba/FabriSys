-- Migration: cria RPC para upsert seguro em configuracoes_sistema
-- Data: 2026-02-17

BEGIN;

-- Função RPC que realiza upsert seguro em configuracoes_sistema.
-- Observação: a função é SECURITY DEFINER e deve ser criada por um superuser/admin.
-- Ela verifica que o chamador tenha role 'admin' ou 'master' via auth.role().
CREATE OR REPLACE FUNCTION public.rpc_upsert_configuracoes_sistema(
  p_organization_id uuid,
  p_chave text,
  p_valor jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_logo_url text;
  v_company_logo_url text;
  v_company_name text;
  v_nome_empresa text;
  v_features jsonb;
  v_theme jsonb;
  v_theme_mode text;
  v_primary_color text;
  v_colors_json jsonb;
  v_modo_pdv text;
  v_fidelidade_fator text;
  v_fidelidade_ativa text;
  v_caller_role text;
BEGIN
  -- Verifica permissão do chamador via tabela `profiles` (mais confiável que auth.role())
  BEGIN
    SELECT role::text INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  EXCEPTION WHEN others THEN
    v_caller_role := NULL;
  END;

  IF v_caller_role NOT IN ('admin', 'master') THEN
    RAISE EXCEPTION 'permission_denied: only admins or master can write dashboard config';
  END IF;

  IF p_valor IS NOT NULL THEN
    -- campos textuais
    v_logo_url := NULLIF(p_valor ->> 'logo_url', '');
    v_company_logo_url := NULLIF(p_valor ->> 'company_logo_url', '');
    v_company_name := NULLIF(p_valor ->> 'company_name', '');
    v_nome_empresa := NULLIF(p_valor ->> 'nome_empresa', '');
    v_theme_mode := NULLIF(p_valor ->> 'theme_mode', '');
    v_primary_color := NULLIF(p_valor ->> 'primary_color', '');
    v_modo_pdv := NULLIF(p_valor ->> 'modo_pdv', '');
    v_fidelidade_fator := NULLIF(p_valor ->> 'fidelidade_fator', '');
    v_fidelidade_ativa := NULLIF(p_valor ->> 'fidelidade_ativa', '');

    -- campos JSON/jsonb
    IF p_valor ? 'features' THEN v_features := p_valor -> 'features'; END IF;
    IF p_valor ? 'theme' THEN v_theme := p_valor -> 'theme'; END IF;
    IF p_valor ? 'colors_json' THEN v_colors_json := p_valor -> 'colors_json'; END IF;
    -- se colors_json não existir, aceitar p_valor->'theme' como fonte secundária
    IF v_colors_json IS NULL AND v_theme IS NOT NULL THEN v_colors_json := v_theme; END IF;
  END IF;

  -- Primeiro tenta atualizar por organização_id (tratando NULL com IS NOT DISTINCT FROM)
  UPDATE public.configuracoes_sistema
  SET
    valor = p_valor,
    logo_url = COALESCE(v_logo_url, logo_url),
    company_logo_url = COALESCE(v_company_logo_url, company_logo_url),
    company_name = COALESCE(v_company_name, company_name),
    nome_empresa = COALESCE(v_nome_empresa, nome_empresa),
    features = COALESCE(v_features, features),
    theme = COALESCE(v_theme, theme),
    theme_mode = COALESCE(v_theme_mode, theme_mode),
    primary_color = COALESCE(v_primary_color, primary_color),
    colors_json = COALESCE(v_colors_json, colors_json),
    modo_pdv = COALESCE(v_modo_pdv, modo_pdv),
    fidelidade_fator = COALESCE(v_fidelidade_fator, fidelidade_fator),
    fidelidade_ativa = COALESCE(v_fidelidade_ativa, fidelidade_ativa),
    updated_at = now()
  WHERE chave = p_chave AND (organization_id IS NOT DISTINCT FROM p_organization_id);

  IF FOUND THEN
    RETURN;
  END IF;

  -- Se não atualizamos nada, tentar inserir; se ocorrer unique_violation por índice customizado,
  -- capturamos e aplicamos um UPDATE concorrente como fallback.
  BEGIN
    INSERT INTO public.configuracoes_sistema (
      chave, organization_id, valor,
      logo_url, company_logo_url, company_name, nome_empresa,
      features, theme, theme_mode, primary_color, colors_json,
      modo_pdv, fidelidade_fator, fidelidade_ativa, updated_at
    ) VALUES (
      p_chave, p_organization_id, p_valor,
      v_logo_url, v_company_logo_url, v_company_name, v_nome_empresa,
      v_features, v_theme, v_theme_mode, v_primary_color, v_colors_json,
      v_modo_pdv, v_fidelidade_fator, v_fidelidade_ativa, now()
    );
  EXCEPTION WHEN unique_violation THEN
    -- Em caso de corrida, aplicar UPDATE
    UPDATE public.configuracoes_sistema
    SET
      valor = p_valor,
      logo_url = COALESCE(v_logo_url, logo_url),
      company_logo_url = COALESCE(v_company_logo_url, company_logo_url),
      company_name = COALESCE(v_company_name, company_name),
      nome_empresa = COALESCE(v_nome_empresa, nome_empresa),
      features = COALESCE(v_features, features),
      theme = COALESCE(v_theme, theme),
      theme_mode = COALESCE(v_theme_mode, theme_mode),
      primary_color = COALESCE(v_primary_color, primary_color),
      colors_json = COALESCE(v_colors_json, colors_json),
      modo_pdv = COALESCE(v_modo_pdv, modo_pdv),
      fidelidade_fator = COALESCE(v_fidelidade_fator, fidelidade_fator),
      fidelidade_ativa = COALESCE(v_fidelidade_ativa, fidelidade_ativa),
      updated_at = now()
    WHERE chave = p_chave AND (organization_id IS NOT DISTINCT FROM p_organization_id);
  END;
END;
$$;

-- Concede execução para usuários autenticados (ajuste conforme suas roles)
GRANT EXECUTE ON FUNCTION public.rpc_upsert_configuracoes_sistema(uuid,text,jsonb) TO authenticated;

COMMIT;

-- Nota: se desejar validação por organização (permitir admins de uma org apenas),
-- podemos alterar a função para checar jwt.claims.organization_id e compará-la com p_organization_id.
