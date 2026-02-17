-- Combined migration to create `configuracoes_sistema` and the RPC upsert
-- Apply both blocks in this file in order.

-- START: create_configuracoes_sistema_and_policies
BEGIN;

-- Tabela de configurações genéricas do sistema
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id bigserial PRIMARY KEY,
  chave text NOT NULL,
  organization_id uuid NULL,
  valor jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Índice único para evitar múltiplas chaves por organization_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_configuracoes_sistema_orgkey_chave
  ON public.configuracoes_sistema (organization_id, chave);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Trigger que atualiza updated_at em updates
DROP TRIGGER IF EXISTS trg_set_updated_at ON public.configuracoes_sistema;
CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON public.configuracoes_sistema
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Habilita Row Level Security (RLS)
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Política: permitir leitura pública (ajuste se necessário)
-- Remover política caso exista (permite reexecução segura)
DROP POLICY IF EXISTS "select_public_configuracoes" ON public.configuracoes_sistema;
CREATE POLICY "select_public_configuracoes"
  ON public.configuracoes_sistema
  FOR SELECT
  USING (true);

-- Política: permitir INSERT/UPDATE/DELETE apenas para roles admin/master
-- Remover política caso exista (permite reexecução segura)
DROP POLICY IF EXISTS "modify_admins_configuracoes" ON public.configuracoes_sistema;
CREATE POLICY "modify_admins_configuracoes"
  ON public.configuracoes_sistema
  FOR ALL
  USING (auth.role() = 'admin' OR auth.role() = 'master')
  WITH CHECK (auth.role() = 'admin' OR auth.role() = 'master');

COMMIT;
-- END: create_configuracoes_sistema_and_policies


-- START: rpc_upsert_configuracoes_sistema
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
    v_logo_url := NULLIF(p_valor ->> 'logo_url', '');
    v_company_logo_url := NULLIF(p_valor ->> 'company_logo_url', '');
    v_company_name := NULLIF(p_valor ->> 'company_name', '');
    v_nome_empresa := NULLIF(p_valor ->> 'nome_empresa', '');
    v_theme_mode := NULLIF(p_valor ->> 'theme_mode', '');
    v_primary_color := NULLIF(p_valor ->> 'primary_color', '');
    v_modo_pdv := NULLIF(p_valor ->> 'modo_pdv', '');
    v_fidelidade_fator := NULLIF(p_valor ->> 'fidelidade_fator', '');
    v_fidelidade_ativa := NULLIF(p_valor ->> 'fidelidade_ativa', '');
    IF p_valor ? 'features' THEN v_features := p_valor -> 'features'; END IF;
    IF p_valor ? 'theme' THEN v_theme := p_valor -> 'theme'; END IF;
    IF p_valor ? 'colors_json' THEN v_colors_json := p_valor -> 'colors_json'; END IF;
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
-- END: rpc_upsert_configuracoes_sistema
