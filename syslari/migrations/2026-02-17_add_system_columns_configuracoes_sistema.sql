-- Migration: adicionar colunas físicas para configurações do sistema e backfill
-- Data: 2026-02-17
-- Objetivo: armazenar configurações por coluna (logo, theme, nomes, features, etc.)

BEGIN;

ALTER TABLE public.configuracoes_sistema
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS company_logo_url text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS nome_empresa text,
  ADD COLUMN IF NOT EXISTS features jsonb,
  ADD COLUMN IF NOT EXISTS theme jsonb,
  ADD COLUMN IF NOT EXISTS theme_mode text,
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS colors_json jsonb,
  ADD COLUMN IF NOT EXISTS modo_pdv text,
  ADD COLUMN IF NOT EXISTS fidelidade_fator text,
  ADD COLUMN IF NOT EXISTS fidelidade_ativa text;

-- Backfill: consolidar valores existentes (registros por chave) em uma linha por organization_id
DO $$
DECLARE
  org RECORD;
  val_text text;
  val_json jsonb;
BEGIN
  FOR org IN SELECT DISTINCT organization_id FROM public.configuracoes_sistema LOOP
    -- Garantir que exista uma linha de destino com chave = 'system_settings'
    -- Tentar criar a linha de destino; se ocorrer unique_violation devido a índice customizado,
    -- capturamos e seguimos (linha já existe)
    BEGIN
      INSERT INTO public.configuracoes_sistema (chave, organization_id, valor, created_at, updated_at)
      VALUES ('system_settings', org.organization_id, '{}'::jsonb, now(), now());
    EXCEPTION WHEN unique_violation THEN
      -- ignore, linha já existe
      NULL;
    END;

    -- Helper: função local para extrair texto cru (remove aspas se valor for jsonb string)
    -- Atualiza cada coluna a partir do primeiro registro encontrado com a chave correspondente

    -- logo_url
    SELECT regexp_replace(cs.valor::text, '^"|"$', '') INTO val_text
    FROM public.configuracoes_sistema cs
    WHERE cs.chave = 'logo_url' AND cs.organization_id IS NOT DISTINCT FROM org.organization_id
    LIMIT 1;
    IF val_text IS NOT NULL THEN
      UPDATE public.configuracoes_sistema
      SET logo_url = val_text, updated_at = now()
      WHERE chave = 'system_settings' AND organization_id IS NOT DISTINCT FROM org.organization_id;
    END IF;

    -- company_logo_url
    SELECT regexp_replace(cs.valor::text, '^"|"$', '') INTO val_text
    FROM public.configuracoes_sistema cs
    WHERE cs.chave = 'company_logo_url' AND cs.organization_id IS NOT DISTINCT FROM org.organization_id
    LIMIT 1;
    IF val_text IS NOT NULL THEN
      UPDATE public.configuracoes_sistema
      SET company_logo_url = val_text, updated_at = now()
      WHERE chave = 'system_settings' AND organization_id IS NOT DISTINCT FROM org.organization_id;
    END IF;

    -- company_name / nome_empresa (try both keys)
    SELECT regexp_replace(cs.valor::text, '^"|"$', '') INTO val_text
    FROM public.configuracoes_sistema cs
    WHERE cs.chave IN ('company_name','nome_empresa') AND cs.organization_id IS NOT DISTINCT FROM org.organization_id
    LIMIT 1;
    IF val_text IS NOT NULL THEN
      UPDATE public.configuracoes_sistema
      SET company_name = val_text, nome_empresa = val_text, updated_at = now()
      WHERE chave = 'system_settings' AND organization_id IS NOT DISTINCT FROM org.organization_id;
    END IF;

    -- features (json) - teste de conteúdo textual para decidir cast seguro
    SELECT CASE WHEN trim(cs.valor::text) LIKE '{%' OR trim(cs.valor::text) LIKE '[%' THEN cs.valor::jsonb ELSE to_jsonb(regexp_replace(cs.valor::text, '^"|"$', '')) END INTO val_json
    FROM public.configuracoes_sistema cs
    WHERE cs.chave IN ('features','funcionalidades') AND cs.organization_id IS NOT DISTINCT FROM org.organization_id
    LIMIT 1;
    IF val_json IS NOT NULL THEN
      UPDATE public.configuracoes_sistema
      SET features = val_json, updated_at = now()
      WHERE chave = 'system_settings' AND organization_id IS NOT DISTINCT FROM org.organization_id;
    END IF;

    -- theme (json) - teste de conteúdo textual para decidir cast seguro
    SELECT CASE WHEN trim(cs.valor::text) LIKE '{%' OR trim(cs.valor::text) LIKE '[%' THEN cs.valor::jsonb ELSE to_jsonb(regexp_replace(cs.valor::text, '^"|"$', '')) END INTO val_json
    FROM public.configuracoes_sistema cs
    WHERE cs.chave IN ('theme','theme_settings') AND cs.organization_id IS NOT DISTINCT FROM org.organization_id
    LIMIT 1;
    IF val_json IS NOT NULL THEN
      UPDATE public.configuracoes_sistema
      SET theme = val_json, updated_at = now()
      WHERE chave = 'system_settings' AND organization_id IS NOT DISTINCT FROM org.organization_id;
    END IF;

    -- theme_mode, primary_color, colors_json
    SELECT regexp_replace(cs.valor::text, '^"|"$', '') INTO val_text
    FROM public.configuracoes_sistema cs
    WHERE cs.chave = 'theme_mode' AND cs.organization_id IS NOT DISTINCT FROM org.organization_id
    LIMIT 1;
    IF val_text IS NOT NULL THEN
      UPDATE public.configuracoes_sistema
      SET theme_mode = val_text, updated_at = now()
      WHERE chave = 'system_settings' AND organization_id IS NOT DISTINCT FROM org.organization_id;
    END IF;

    SELECT regexp_replace(cs.valor::text, '^"|"$', '') INTO val_text
    FROM public.configuracoes_sistema cs
    WHERE cs.chave = 'primary_color' AND cs.organization_id IS NOT DISTINCT FROM org.organization_id
    LIMIT 1;
    IF val_text IS NOT NULL THEN
      UPDATE public.configuracoes_sistema
      SET primary_color = val_text, updated_at = now()
      WHERE chave = 'system_settings' AND organization_id IS NOT DISTINCT FROM org.organization_id;
    END IF;

    SELECT CASE WHEN trim(cs.valor::text) LIKE '{%' OR trim(cs.valor::text) LIKE '[%' THEN cs.valor::jsonb ELSE to_jsonb(regexp_replace(cs.valor::text, '^"|"$', '')) END INTO val_json
    FROM public.configuracoes_sistema cs
    WHERE cs.chave = 'colors_json' AND cs.organization_id IS NOT DISTINCT FROM org.organization_id
    LIMIT 1;
    IF val_json IS NOT NULL THEN
      UPDATE public.configuracoes_sistema
      SET colors_json = val_json, updated_at = now()
      WHERE chave = 'system_settings' AND organization_id IS NOT DISTINCT FROM org.organization_id;
    END IF;

    -- modo_pdv
    SELECT regexp_replace(cs.valor::text, '^"|"$', '') INTO val_text
    FROM public.configuracoes_sistema cs
    WHERE cs.chave = 'modo_pdv' AND cs.organization_id IS NOT DISTINCT FROM org.organization_id
    LIMIT 1;
    IF val_text IS NOT NULL THEN
      UPDATE public.configuracoes_sistema
      SET modo_pdv = val_text, updated_at = now()
      WHERE chave = 'system_settings' AND organization_id IS NOT DISTINCT FROM org.organization_id;
    END IF;

    -- fidelidade_fator, fidelidade_ativa
    SELECT regexp_replace(cs.valor::text, '^"|"$', '') INTO val_text
    FROM public.configuracoes_sistema cs
    WHERE cs.chave = 'fidelidade_fator' AND cs.organization_id IS NOT DISTINCT FROM org.organization_id
    LIMIT 1;
    IF val_text IS NOT NULL THEN
      UPDATE public.configuracoes_sistema
      SET fidelidade_fator = val_text, updated_at = now()
      WHERE chave = 'system_settings' AND organization_id IS NOT DISTINCT FROM org.organization_id;
    END IF;

    SELECT regexp_replace(cs.valor::text, '^"|"$', '') INTO val_text
    FROM public.configuracoes_sistema cs
    WHERE cs.chave = 'fidelidade_ativa' AND cs.organization_id IS NOT DISTINCT FROM org.organization_id
    LIMIT 1;
    IF val_text IS NOT NULL THEN
      UPDATE public.configuracoes_sistema
      SET fidelidade_ativa = val_text, updated_at = now()
      WHERE chave = 'system_settings' AND organization_id IS NOT DISTINCT FROM org.organization_id;
    END IF;

  END LOOP;
END
$$;

COMMIT;

-- Observação: revise os resultados com:
-- SELECT organization_id, chave, logo_url, company_logo_url, company_name, features FROM public.configuracoes_sistema WHERE chave = 'system_settings';
-- Depois de validar, você pode ajustar o frontend para ler/escrever nestas colunas ou
-- remover as chaves antigas (opcional, após backup).
