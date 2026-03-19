-- Migration: adiciona vínculo de profiles a organization e local
-- Adiciona colunas organization_id e local_id em public.profiles
-- e cria índices e constraints de foreign key.

BEGIN;

-- Adiciona organization_id se não existir
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Adiciona local_id se não existir
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS local_id uuid;

-- Tenta criar FK para organizations (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='organizations') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_organization_id_fkey') THEN
      EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL';
    END IF;
  END IF;
END
$$;

-- Tenta criar FK para locais (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='locais') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_local_id_fkey') THEN
      EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT profiles_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locais(id) ON DELETE SET NULL';
    END IF;
  END IF;
END
$$;

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles (organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_local_id ON public.profiles (local_id);

COMMIT;

-- NOTAS:
-- 1) Após aplicar a migration, considere backfill de `organization_id` a partir do relacionamento de usuários
--    já existentes (por exemplo, inferir organization_id a partir de locais ou de outra tabela de vínculo).
-- 2) Atualize políticas RLS conforme necessário para incluir checks em organization_id/local_id.
-- 3) Em ambientes com Supabase, aplique via `supabase db push` ou execute no psql com credenciais apropriadas.
