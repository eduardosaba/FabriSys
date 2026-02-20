-- Allow admin/service_role to insert into fornecedores
-- Date: 2026-02-19

BEGIN;

ALTER TABLE IF EXISTS public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Replace only the INSERT policy to allow admins or service_role to insert
DROP POLICY IF EXISTS fornecedores_insert ON public.fornecedores;

CREATE POLICY fornecedores_insert ON public.fornecedores
  FOR INSERT
  WITH CHECK (
    -- allow when organization matches user's profile
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    -- or allow if the user is marked as admin in profiles
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND COALESCE(is_admin, false) = true)
    -- or allow server/service role (service_role JWT / server key)
    OR auth.role() = 'service_role'
  );

COMMIT;
