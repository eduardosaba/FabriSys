-- Migration: sugestão de políticas RLS para suportar organization_id/local_id
-- Atenção: revise e adapte estas políticas ao seu modelo de autorização antes de aplicar.

BEGIN;

-- 1) Permitir que o próprio usuário veja/atualize seu profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Garantir remoção de possíveis políticas antigas ou com nomes alternativos
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: users can select own or same-organization (admins)" ON public.profiles;
DROP POLICY IF EXISTS "Users can select own or same-organization (admins)" ON public.profiles;
CREATE POLICY "Profiles: users can select own or same-organization (admins)" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR (
      -- usa claims JWT (sincronizadas em auth.users) para evitar consultas recursivas em public.profiles
      ((current_setting('jwt.claims', true))::json->>'organization_id') IS NOT NULL
      AND ((current_setting('jwt.claims', true))::json->>'organization_id') = public.profiles.organization_id::text
      AND ((current_setting('jwt.claims', true))::json->>'role') IN ('admin','master')
    )
  );

-- 2) Permitir que admins da organização atualizem perfis da mesma org
-- Garantir remoção de possíveis políticas antigas antes de criar a nova
DROP POLICY IF EXISTS "Profiles: org admins can update" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own or same-organization (admins)" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Profiles: org admins can update" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR (
      -- evita subselects: baseia autorização nas claims do JWT
      ((current_setting('jwt.claims', true))::json->>'organization_id') IS NOT NULL
      AND ((current_setting('jwt.claims', true))::json->>'organization_id') = public.profiles.organization_id::text
      AND ((current_setting('jwt.claims', true))::json->>'role') IN ('admin','master')
    )
  );

-- 3) Exemplo: policy para tabela user_theme_colors que permite leitura a todos autenticados,
--    e escrita apenas ao usuário dono ou ao admin da mesma org.
DROP POLICY IF EXISTS "user_theme_colors_select_auth" ON public.user_theme_colors;
CREATE POLICY "user_theme_colors_select_auth" ON public.user_theme_colors
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "user_theme_colors_upsert_owner_or_org_admin" ON public.user_theme_colors;
CREATE POLICY "user_theme_colors_upsert_owner_or_org_admin" ON public.user_theme_colors
  FOR ALL
  USING (
    -- permitimos leitura/execuções somente se for o próprio usuário ou admin da org
    auth.uid() = user_id
    OR (
      -- baseado em claims JWT para evitar recursão
      ((current_setting('jwt.claims', true))::json->>'organization_id') IS NOT NULL
      AND (
        (user_theme_colors.organization_id IS NOT NULL AND ((current_setting('jwt.claims', true))::json->>'organization_id') = user_theme_colors.organization_id::text)
        OR (user_theme_colors.organization_id IS NULL AND ((current_setting('jwt.claims', true))::json->>'role') IN ('admin','master'))
      )
    )
  )
  WITH CHECK (
    -- ao inserir/atualizar, garantir que o registro pertença ao usuário ou à organização do admin
    auth.uid() = user_id
    OR (
      -- validação baseada nas claims do JWT
      ((current_setting('jwt.claims', true))::json->>'organization_id') IS NOT NULL
      AND ((current_setting('jwt.claims', true))::json->>'organization_id') = user_theme_colors.organization_id::text
      AND ((current_setting('jwt.claims', true))::json->>'role') IN ('admin','master')
    )
  );

COMMIT;
