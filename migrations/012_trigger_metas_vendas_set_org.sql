-- Migration: trigger para popular organization_id em metas_vendas a partir de locais
-- Execute no Supabase SQL editor

BEGIN;

-- Função que copia organization_id de `locais` para `metas_vendas` quando possível
CREATE OR REPLACE FUNCTION public.set_metas_vendas_organization()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Se já foi fornecido organization_id, mantém
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Tenta buscar organization_id a partir do local relacionado
  SELECT organization_id INTO NEW.organization_id FROM locais WHERE id = NEW.local_id LIMIT 1;

  RETURN NEW;
END;
$$;

-- Trigger BEFORE INSERT OR UPDATE quando local_id é definido/alterado
DROP TRIGGER IF EXISTS trg_set_metas_vendas_org ON metas_vendas;
CREATE TRIGGER trg_set_metas_vendas_org
BEFORE INSERT OR UPDATE OF local_id ON metas_vendas
FOR EACH ROW
EXECUTE FUNCTION public.set_metas_vendas_organization();

COMMIT;

-- Observações:
-- - Esta trigger garante que novas inserções (ou updates que mudem local_id)
--   preencham organization_id automaticamente quando possível.
-- - Ainda é recomendável manter a migration anterior (011) para backfill de registros antigos.
