-- Migration: update profiles role check to include all allowed roles
-- Date: 2026-03-17

-- Drop the existing CHECK constraint (if present) and recreate it with the expanded set of roles.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN (
    'pdv', 'gerente', 'compras', 'admin', 'master', 'fabrica', 'operador', 'user'
  ));

-- Optional: normalize any existing rows that have unexpected roles (log/report only)
-- You may want to inspect rows that would fail this constraint before enabling it.
-- Example to list problematic rows (run manually before applying in production):
-- SELECT id, role FROM public.profiles WHERE role NOT IN ('pdv','gerente','compras','admin','master','fabrica','operador','user');
