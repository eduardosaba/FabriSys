-- Migration: 054_rls_movimentacao_admin_master.sql
-- Objetivo: habilitar Row Level Security (RLS) e policies para restringir
-- atualizações e exclusões em `movimentacao_estoque` apenas para roles admin|master.

-- ATENÇÃO: revise as expressões de jwt.claims.role conforme o JWT/claims que o Supabase
-- emite no seu projeto. Ajuste `auth.role`/`request.jwt.claims` conforme necessário.

BEGIN;

-- Ativa RLS na tabela (se ainda não estiver ativa)
ALTER TABLE IF EXISTS public.movimentacao_estoque ENABLE ROW LEVEL SECURITY;

-- Política: permitir SELECT para todos usuários autenticados (ajuste conforme necessidade)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'mov_selecao_para_autenticados'
  ) THEN
    CREATE POLICY mov_selecao_para_autenticados ON public.movimentacao_estoque
      FOR SELECT
      USING (auth.role() IS NOT NULL);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Não foi possível criar policy mov_selecao_para_autenticados (verifique permissões)';
END
$$;

-- Política: permitir INSERT para usuários autenticados (normalmente o backend ou função/lambda)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'mov_insert_autenticados'
  ) THEN
    CREATE POLICY mov_insert_autenticados ON public.movimentacao_estoque
      FOR INSERT
      WITH CHECK (auth.role() IS NOT NULL);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Não foi possível criar policy mov_insert_autenticados (verifique permissões)';
END
$$;

-- Política: permitir UPDATE apenas para roles 'admin' ou 'master'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'mov_update_admin_master'
  ) THEN
    CREATE POLICY mov_update_admin_master ON public.movimentacao_estoque
      FOR UPDATE
      USING ( (auth.role() = 'admin') OR (auth.role() = 'master') )
      WITH CHECK ( (auth.role() = 'admin') OR (auth.role() = 'master') );
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Não foi possível criar policy mov_update_admin_master (verifique permissões)';
END
$$;

-- Política: permitir DELETE apenas para roles 'admin' ou 'master'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'mov_delete_admin_master'
  ) THEN
    CREATE POLICY mov_delete_admin_master ON public.movimentacao_estoque
      FOR DELETE
      USING ( (auth.role() = 'admin') OR (auth.role() = 'master') );
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Não foi possível criar policy mov_delete_admin_master (verifique permissões)';
END
$$;

COMMIT;

-- Observações:
-- 1) Teste essas policies em um ambiente de staging antes de aplicar em produção.
-- 2) Se seu projeto Supabase usa claims JWT diferentes (ex: request.jwt.claims.role
--    ou current_setting('jwt.claims.role')), substitua `auth.role()` pelas expressões
--    apropriadas. A função `auth.role()` é uma helper do Supabase/pgjwt em algumas
--    instalações; confirme no seu ambiente.
