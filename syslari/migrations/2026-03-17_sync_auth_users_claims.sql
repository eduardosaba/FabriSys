-- Migration: sincroniza auth.users.raw_user_meta_data a partir de public.profiles
-- Backfill existing auth.users.raw_user_meta_data from profiles and add trigger to keep in sync

BEGIN;

-- Backfill: copia organization_id, local_id e role de profiles para auth.users.raw_user_meta_data
UPDATE auth.users u
SET raw_user_meta_data = (
  COALESCE(u.raw_user_meta_data::jsonb, '{}'::jsonb) ||
  jsonb_strip_nulls(jsonb_build_object(
    'organization_id', p.organization_id,
    'local_id', p.local_id,
    'role', p.role
  ))
)::text
FROM public.profiles p
WHERE u.id = p.id
  AND (
    p.organization_id IS NOT NULL OR p.local_id IS NOT NULL OR p.role IS NOT NULL
  );

-- Função que sincroniza auth.users.raw_user_meta_data quando profiles é inserido/atualizado
CREATE OR REPLACE FUNCTION auth.sync_user_meta_from_profiles()
RETURNS trigger AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = (
    COALESCE(raw_user_meta_data::jsonb, '{}'::jsonb) ||
    jsonb_strip_nulls(jsonb_build_object(
      'organization_id', NEW.organization_id,
      'local_id', NEW.local_id,
      'role', NEW.role
    ))
  )::text
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para manter sincronização
DROP TRIGGER IF EXISTS sync_user_meta_from_profiles ON public.profiles;
CREATE TRIGGER sync_user_meta_from_profiles
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION auth.sync_user_meta_from_profiles();

COMMIT;
