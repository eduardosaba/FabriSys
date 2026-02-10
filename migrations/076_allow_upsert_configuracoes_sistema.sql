-- 076_allow_upsert_configuracoes_sistema.sql
-- Permite que usuários autenticados façam INSERT/UPDATE em configuracoes_sistema
-- Execute no Supabase SQL Editor ou via CLI (como migration)

BEGIN;

-- Garante que RLS está habilitado (normalmente já está para essa tabela)
ALTER TABLE IF EXISTS public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Remove política antiga caso exista
-- Remove políticas antigas caso existam
DROP POLICY IF EXISTS allow_authenticated_upsert_on_configuracoes_sistema ON public.configuracoes_sistema;
DROP POLICY IF EXISTS allow_authenticated_insert_on_configuracoes_sistema ON public.configuracoes_sistema;
DROP POLICY IF EXISTS allow_authenticated_update_on_configuracoes_sistema ON public.configuracoes_sistema;

-- Cria policy separada para INSERT
CREATE POLICY allow_authenticated_insert_on_configuracoes_sistema
  ON public.configuracoes_sistema
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Cria policy separada para UPDATE
CREATE POLICY allow_authenticated_update_on_configuracoes_sistema
  ON public.configuracoes_sistema
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

COMMIT;

-- Nota: se você quiser restringir ainda mais (ex: apenas admins), ajuste a condição
-- USING/WITH CHECK para verificar um campo owner ou usar auth.uid().
