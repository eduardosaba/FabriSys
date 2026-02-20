-- Migration: adicionar coluna is_admin em profiles
-- Date: 2026-02-19

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles (is_admin);

-- Nota: marque administradores manualmente após aplicar a migration:
-- UPDATE public.profiles SET is_admin = true WHERE email IN ('admin@exemplo.com');

COMMIT;
