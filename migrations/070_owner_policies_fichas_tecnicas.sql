-- Idempotent policies for fichas_tecnicas (Opção B)
-- Apply in Supabase SQL editor or via psql. Adjust get_my_org()/get_my_role() if not present.

BEGIN;

-- Ensure RLS enabled
ALTER TABLE IF EXISTS public.fichas_tecnicas ENABLE ROW LEVEL SECURITY;

-- Drop known redundant/legacy policies (safe no-op if they don't exist)
DROP POLICY IF EXISTS "Permitir insert para admin" ON public.fichas_tecnicas;
DROP POLICY IF EXISTS "Permitir insert para master" ON public.fichas_tecnicas;
DROP POLICY IF EXISTS master_insert_fichas_tecnicas ON public.fichas_tecnicas;
DROP POLICY IF EXISTS "master_insert_fichas_tecnicas" ON public.fichas_tecnicas;
DROP POLICY IF EXISTS "admin_master_insert_fichas_tecnicas" ON public.fichas_tecnicas;

-- Ensure SaaS isolation policy exists (do nothing if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'fichas_tecnicas' AND p.polname = 'SaaS Isolation Safe'
  ) THEN
    CREATE POLICY "SaaS Isolation Safe"
      ON public.fichas_tecnicas
      FOR ALL
      USING ((organization_id = get_my_org()) OR (get_my_role() = 'master'::text));
  END IF;
END$$;

-- Insert: allow authenticated users to INSERT when they are owner OR belong to same org OR are master
DROP POLICY IF EXISTS insert_fichas_owner ON public.fichas_tecnicas;
CREATE POLICY insert_fichas_owner
  ON public.fichas_tecnicas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (created_by = auth.uid())
    OR (organization_id IS NOT NULL AND organization_id = get_my_org())
    OR (get_my_role() = 'master'::text)
  );

-- Update: allow authenticated users to UPDATE their own rows or rows in same org (or master)
DROP POLICY IF EXISTS update_fichas_owner ON public.fichas_tecnicas;
CREATE POLICY update_fichas_owner
  ON public.fichas_tecnicas
  FOR UPDATE
  TO authenticated
  USING (
    (created_by = auth.uid())
    OR (organization_id IS NOT NULL AND organization_id = get_my_org())
    OR (get_my_role() = 'master'::text)
  )
  WITH CHECK (
    (created_by = auth.uid())
    OR (organization_id IS NOT NULL AND organization_id = get_my_org())
    OR (get_my_role() = 'master'::text)
  );

-- Delete: allow owner or same-org or master to DELETE
DROP POLICY IF EXISTS delete_fichas_owner ON public.fichas_tecnicas;
CREATE POLICY delete_fichas_owner
  ON public.fichas_tecnicas
  FOR DELETE
  TO authenticated
  USING (
    (created_by = auth.uid())
    OR (organization_id IS NOT NULL AND organization_id = get_my_org())
    OR (get_my_role() = 'master'::text)
  );

COMMIT;

-- Notes:
-- - This file assumes the helper functions get_my_org() and get_my_role() exist in the DB.
--   If they do not exist, replace calls with appropriate checks, e.g.:
--     (organization_id = (auth.jwt() ->> 'organization_id'))
--   or adapt to your tenant model.
-- - Keep admin/master policies as-is; these owner policies are additive and restrict regular authenticated users.
