-- Migration: criar tabela configuracoes_sistema + índice único + trigger + políticas RLS
-- Data: 2026-02-17

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
-- Política: permitir leitura pública (ajuste se necessário)
-- Remover política caso exista (permite reexecução segura)
DROP POLICY IF EXISTS "select_public_configuracoes" ON public.configuracoes_sistema;
CREATE POLICY "select_public_configuracoes"
  ON public.configuracoes_sistema
  FOR SELECT
  USING (true);

-- Política: permitir INSERT/UPDATE/DELETE apenas para roles admin/master
-- Política: permitir INSERT/UPDATE/DELETE apenas para roles admin/master
-- Remover política caso exista (permite reexecução segura)
DROP POLICY IF EXISTS "modify_admins_configuracoes" ON public.configuracoes_sistema;
CREATE POLICY "modify_admins_configuracoes"
  ON public.configuracoes_sistema
  FOR ALL
  USING (auth.role() = 'admin' OR auth.role() = 'master')
  WITH CHECK (auth.role() = 'admin' OR auth.role() = 'master');

COMMIT;

-- Observação: adapte as políticas conforme as claims do seu JWT.
-- Em ambientes onde organization administration é delegada a usuários, considere
-- criar políticas adicionais que verifiquem uma claim como `jwt.claims.organization_id`.
