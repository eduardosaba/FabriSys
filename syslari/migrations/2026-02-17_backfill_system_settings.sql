-- Migration: consolidar várias chaves de configuração em um único registro `system_settings`
-- Data: 2026-02-17
-- Objetivo: agregar valores existentes (logo, tema, nomes, features, etc.) em um único JSON
-- por organization_id (inclui org nula/global) para facilitar leitura/escrita em coluna única.

BEGIN;

-- Ajuste a lista abaixo conforme as chaves que existem na sua base e que você quer consolidar.
-- Exemplos: logo_url, company_logo_url, company_name, nome_empresa, features, funcionalidades,
-- theme, theme_mode, primary_color, colors_json, modo_pdv, fidelidade_fator, fidelidade_ativa

DO $$
BEGIN
  -- Criar um registro consolidado por organization_id agregando as chaves conhecidas
  INSERT INTO public.configuracoes_sistema (chave, organization_id, valor, created_at, updated_at)
  SELECT
    'system_settings' as chave,
    organization_id,
    jsonb_object_agg(chave, to_jsonb(valor)) AS valor,
    now(), now()
  FROM public.configuracoes_sistema
  WHERE chave IN (
    'logo_url', 'company_logo_url', 'company_name', 'nome_empresa',
    'features', 'funcionalidades', 'theme', 'theme_mode', 'primary_color', 'colors_json',
    'modo_pdv', 'fidelidade_fator', 'fidelidade_ativa'
  )
  GROUP BY organization_id
  ON CONFLICT (organization_id, chave)
  DO UPDATE SET valor = EXCLUDED.valor, updated_at = now();

  -- Nota: a agregação usa to_jsonb(valor) — valores simples (text) serão guardados como strings
  -- dentro do JSON, valores que já forem JSON (json/jsonb) também serão preservados.
END
$$;

COMMIT;

-- Depois de aplicar esta migration, recomendamos verificar os registros resultantes:
-- SELECT organization_id, valor FROM public.configuracoes_sistema WHERE chave = 'system_settings';
-- Se tudo estiver correto, podemos ajustar o frontend para gravar apenas nesta chave unificada
-- em vez de múltiplas linhas por cada campo.
