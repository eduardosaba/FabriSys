-- Migration: abrir RLS de fornecedores para usuários autenticados
-- Date: 2026-02-19

BEGIN;

-- Garantir que RLS está habilitado
ALTER TABLE IF EXISTS public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS fornecedores_select ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_insert ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_update ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_delete ON public.fornecedores;

-- Criar policies permissivas para usuários autenticados (e service_role)
CREATE POLICY fornecedores_select ON public.fornecedores
  FOR SELECT
  USING (
    auth.role() = 'authenticated' OR auth.role() = 'service_role'
  );

CREATE POLICY fornecedores_insert ON public.fornecedores
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' OR auth.role() = 'service_role'
  );

CREATE POLICY fornecedores_update ON public.fornecedores
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' OR auth.role() = 'service_role'
  )
  WITH CHECK (
    auth.role() = 'authenticated' OR auth.role() = 'service_role'
  );

CREATE POLICY fornecedores_delete ON public.fornecedores
  FOR DELETE
  USING (
    auth.role() = 'authenticated' OR auth.role() = 'service_role'
  );

COMMIT;
