-- Migration: 061_fix_categorias_policies.sql
-- Purpose: fix RLS policies on `categorias` so authenticated users can insert
-- rows when they set `created_by = auth.uid()`. This replaces a generic
-- `manage_categorias` policy with explicit per-action policies.

BEGIN;

-- Ensure table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'categorias'
  ) THEN
    RAISE EXCEPTION 'Table public.categorias does not exist; aborting policy migration';
  END IF;
END$$;

-- Drop the old generic policy if present
DROP POLICY IF EXISTS manage_categorias ON public.categorias;

-- Create/replace explicit policies
-- Allow authenticated users to SELECT rows
DROP POLICY IF EXISTS select_categorias ON public.categorias;
CREATE POLICY select_categorias ON public.categorias
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow INSERT only when the new row's created_by equals the caller
DROP POLICY IF EXISTS insert_categorias ON public.categorias;
CREATE POLICY insert_categorias ON public.categorias
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Allow UPDATE only on rows owned by caller (created_by)
DROP POLICY IF EXISTS update_categorias ON public.categorias;
CREATE POLICY update_categorias ON public.categorias
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Allow DELETE only on rows owned by caller
DROP POLICY IF EXISTS delete_categorias ON public.categorias;
CREATE POLICY delete_categorias ON public.categorias
  FOR DELETE
  USING (created_by = auth.uid());

-- Ensure authenticated role still has privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;

COMMIT;

/* Notes:
 - This policy model uses `created_by = auth.uid()` as the ownership check.
 - The frontend must set `created_by` to the current user's id (auth.uid()) when
   inserting categories (the client already does this via profile.id).
 - If you want organization-level policies instead (allow all users from the same
   organization), policies should be changed to compare `organization_id` against
   a JWT claim or to join the profiles table; adjust later if needed.
 - After applying DDL, Supabase / PostgREST may take a moment to refresh schema
   cache. If you still see PGRST204 or 403, try restarting the Supabase REST
   service or wait a few seconds.
*/
