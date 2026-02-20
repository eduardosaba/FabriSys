-- Migration: fornecedores RLS + helper insert function
-- Date: 2026-02-19

BEGIN;

-- 1) Garantir coluna de tenant
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- 2) Index de performance
CREATE INDEX IF NOT EXISTS idx_fornecedores_organization_id ON public.fornecedores (organization_id);

-- 3) Recriar políticas RLS (idempotente: drop antes)
DROP POLICY IF EXISTS fornecedores_select ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_insert ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_update ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_delete ON public.fornecedores;

-- Policy: seleção apenas na mesma organização (extrai claim do JWT)
CREATE POLICY fornecedores_select ON public.fornecedores
  FOR SELECT
  USING (
    organization_id = ((current_setting('request.jwt.claims', true))::json->>'organization_id')::uuid
  );

-- Policy: insert somente se o novo registro pertencer à organização do JWT
CREATE POLICY fornecedores_insert ON public.fornecedores
  FOR INSERT
  WITH CHECK (
    organization_id = ((current_setting('request.jwt.claims', true))::json->>'organization_id')::uuid
  );

-- Policy: update permitido apenas dentro da organização; e garantir checagem de org no novo valor
CREATE POLICY fornecedores_update ON public.fornecedores
  FOR UPDATE
  USING (
    organization_id = ((current_setting('request.jwt.claims', true))::json->>'organization_id')::uuid
  )
  WITH CHECK (
    organization_id = ((current_setting('request.jwt.claims', true))::json->>'organization_id')::uuid
  );

-- Policy: delete permitido apenas dentro da organização
CREATE POLICY fornecedores_delete ON public.fornecedores
  FOR DELETE
  USING (
    organization_id = ((current_setting('request.jwt.claims', true))::json->>'organization_id')::uuid
  );

-- 4) Optional: função segura para inserir fornecedor sem depender do client enviar organization_id
DROP FUNCTION IF EXISTS public.insert_fornecedor(text, text, text, text, uuid);
CREATE OR REPLACE FUNCTION public.insert_fornecedor(
  p_nome text,
  p_cnpj text,
  p_email text,
  p_telefone text,
  p_categoria_id uuid DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_org uuid := ((current_setting('request.jwt.claims', true))::json->>'organization_id')::uuid;
BEGIN
  INSERT INTO public.fornecedores (nome, cnpj, email, telefone, categoria_id, organization_id)
  VALUES (p_nome, p_cnpj, p_email, p_telefone, p_categoria_id, v_org);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.insert_fornecedor(text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_fornecedor(text, text, text, text, uuid) TO anon;

COMMIT;
