-- Migration: backfill de profiles.organization_id e profiles.local_id
-- Estratégias aplicadas:
-- 1) Se profiles.organization_id for NULL e profiles.local_id referir um registro em locais,
--    copiamo-lo de locais.organization_id.
-- 2) Se profiles.local_id for NULL e existe um caixa_sessao aberto com usuario_abertura = profiles.id,
--    usamos esse caixa_sessao.local_id.
-- 3) Registramos alterações em uma tabela de log para auditoria.

BEGIN;

-- Tabela de log para auditoria do backfill
CREATE TABLE IF NOT EXISTS public.migration_backfill_profiles_log (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  profile_id uuid,
  local_id uuid,
  organization_id uuid,
  note text,
  created_at timestamptz default now()
);

-- 1) Preencher organization_id a partir de profiles.local_id -> locais.organization_id
WITH updated AS (
  UPDATE public.profiles p
  SET organization_id = l.organization_id
  FROM public.locais l
  WHERE p.organization_id IS NULL
    AND p.local_id IS NOT NULL
    AND p.local_id = l.id
  RETURNING p.id AS profile_id, p.local_id, l.organization_id
)
INSERT INTO public.migration_backfill_profiles_log(type, profile_id, local_id, organization_id)
SELECT 'set_org_from_local', profile_id, local_id, organization_id FROM updated;

-- 2) Se houver caixa_sessao aberto do usuário, usar seu local_id para preencher profiles.local_id
WITH updated AS (
  UPDATE public.profiles p
  SET local_id = cs.local_id
  FROM public.caixa_sessao cs
  WHERE p.local_id IS NULL
    AND cs.usuario_abertura = p.id
    AND cs.status = 'aberto'
  RETURNING p.id AS profile_id, cs.local_id
)
INSERT INTO public.migration_backfill_profiles_log(type, profile_id, local_id)
SELECT 'set_local_from_open_caixa', profile_id, local_id FROM updated;

-- Observação: as heurísticas acima são conservadoras. Para casos não cobertos,
-- considere análise manual (listar perfis que ainda não têm organization_id/local_id):
-- SELECT id,email FROM public.profiles WHERE organization_id IS NULL OR local_id IS NULL;

COMMIT;
