-- 060_add_rls_pedidos_fornecedores.sql
-- Cria policies RLS seguras para `fornecedores`, `pedidos_compra` e `itens_pedido_compra`.
-- Editar a lista de roles conforme sua configuração JWT antes de aplicar.

-- WARNING: test in staging first. This script attempts to create policies
-- only when uma policy com mesmo nome não existir.

DO $$
BEGIN
  -- Fornecedores: permitir SELECT para roles confiáveis
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p WHERE p.polname = 'rls_select_fornecedores_roles' AND p.polrelid = 'public.fornecedores'::regclass
  ) THEN
    EXECUTE format($qs$
      CREATE POLICY rls_select_fornecedores_roles
      ON public.fornecedores
      FOR SELECT
      USING ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('master','admin','fabrica'))
    $qs$);
  END IF;

  -- Pedidos_compra: permitir SELECT para fabrica/admin/master
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p WHERE p.polname = 'rls_select_pedidos_roles' AND p.polrelid = 'public.pedidos_compra'::regclass
  ) THEN
    EXECUTE format($qs$
      CREATE POLICY rls_select_pedidos_roles
      ON public.pedidos_compra
      FOR SELECT
      USING ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('master','admin','fabrica'))
    $qs$);
  END IF;

  -- Pedidos_compra: INSERT apenas para master/admin (com CHECK)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p WHERE p.polname = 'rls_insert_pedidos_admin' AND p.polrelid = 'public.pedidos_compra'::regclass
  ) THEN
    EXECUTE format($qs$
      CREATE POLICY rls_insert_pedidos_admin
      ON public.pedidos_compra
      FOR INSERT
      WITH CHECK ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('master','admin'))
    $qs$);
  END IF;

  -- Pedidos_compra: UPDATE apenas para master/admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p WHERE p.polname = 'rls_update_pedidos_admin' AND p.polrelid = 'public.pedidos_compra'::regclass
  ) THEN
    EXECUTE format($qs$
      CREATE POLICY rls_update_pedidos_admin
      ON public.pedidos_compra
      FOR UPDATE
      USING ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('master','admin'))
      WITH CHECK ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('master','admin'))
    $qs$);
  END IF;

  -- Pedidos_compra: DELETE apenas para master/admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p WHERE p.polname = 'rls_delete_pedidos_admin' AND p.polrelid = 'public.pedidos_compra'::regclass
  ) THEN
    EXECUTE format($qs$
      CREATE POLICY rls_delete_pedidos_admin
      ON public.pedidos_compra
      FOR DELETE
      USING ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('master','admin'))
    $qs$);
  END IF;

  -- Itens_pedido_compra: SELECT para fabrica/admin/master
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p WHERE p.polname = 'rls_select_itens_roles' AND p.polrelid = 'public.itens_pedido_compra'::regclass
  ) THEN
    EXECUTE format($qs$
      CREATE POLICY rls_select_itens_roles
      ON public.itens_pedido_compra
      FOR SELECT
      USING ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('master','admin','fabrica'))
    $qs$);
  END IF;

  -- Itens_pedido_compra: INSERT apenas para master/admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p WHERE p.polname = 'rls_insert_itens_admin' AND p.polrelid = 'public.itens_pedido_compra'::regclass
  ) THEN
    EXECUTE format($qs$
      CREATE POLICY rls_insert_itens_admin
      ON public.itens_pedido_compra
      FOR INSERT
      WITH CHECK ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('master','admin'))
    $qs$);
  END IF;

  -- Itens_pedido_compra: UPDATE apenas para master/admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p WHERE p.polname = 'rls_update_itens_admin' AND p.polrelid = 'public.itens_pedido_compra'::regclass
  ) THEN
    EXECUTE format($qs$
      CREATE POLICY rls_update_itens_admin
      ON public.itens_pedido_compra
      FOR UPDATE
      USING ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('master','admin'))
      WITH CHECK ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('master','admin'))
    $qs$);
  END IF;

  -- Itens_pedido_compra: DELETE apenas para master/admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p WHERE p.polname = 'rls_delete_itens_admin' AND p.polrelid = 'public.itens_pedido_compra'::regclass
  ) THEN
    EXECUTE format($qs$
      CREATE POLICY rls_delete_itens_admin
      ON public.itens_pedido_compra
      FOR DELETE
      USING ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('master','admin'))
    $qs$);
  END IF;

END
$$;

-- OBSERVAÇÕES:
-- 1) Substitua as roles ('master','admin','fabrica') pelas roles reais usadas nas suas JWT claims.
-- 2) current_setting('request.jwt.claims', true) ->> 'role' é a forma padrão do Supabase para extrair a claim 'role'.
--    Se você usa outra claim (ex: 'app_role'), ajuste as expressões.
-- 3) Teste em staging. Aplicar em produção sem testes pode bloquear aplicações se as roles/claims forem diferentes.
