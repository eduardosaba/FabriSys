-- Migration: fornecedores RLS fallback usando profiles (auth.uid())
-- Date: 2026-02-19

BEGIN;

-- Habilitar RLS caso não esteja
ALTER TABLE IF EXISTS public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Substituir políticas para usar organization_id a partir da tabela profiles (auth.uid())
DROP POLICY IF EXISTS fornecedores_select ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_insert ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_update ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_delete ON public.fornecedores;

CREATE POLICY fornecedores_select ON public.fornecedores
  FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY fornecedores_insert ON public.fornecedores
  FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY fornecedores_update ON public.fornecedores
  FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY fornecedores_delete ON public.fornecedores
  FOR DELETE
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

COMMIT;
