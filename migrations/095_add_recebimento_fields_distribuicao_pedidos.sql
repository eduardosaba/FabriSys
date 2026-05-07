-- 095_add_recebimento_fields_distribuicao_pedidos.sql
-- Adiciona colunas para rastrear recebimento em `distribuicao_pedidos`.
BEGIN;

ALTER TABLE IF EXISTS public.distribuicao_pedidos
  ADD COLUMN IF NOT EXISTS quantidade_recebida numeric,
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS recebido_por uuid REFERENCES auth.users(id);

COMMIT;

-- Nota: após aplicar, reinicie o cache do Supabase/PostgREST se necessário.
