-- Torna funções de finalização SECURITY DEFINER e owner = postgres
-- Aplica para as funções: finalizar_op_kanban, finalizar_ordem_producao,
-- finalizar_producao_intermediaria, finalizar_venda_completa (todas as overloads em public)

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'finalizar_op_kanban',
        'finalizar_ordem_producao',
        'finalizar_producao_intermediaria',
        'finalizar_venda_completa',
        -- Funções de logística / estoque
        'enviar_carga_loja',
        'receber_carga_pdv',
        'confirmar_recebimento_pdv'
      )
  LOOP
    RAISE NOTICE 'Applying to % %', rec.proname, rec.sig;
    EXECUTE format('ALTER FUNCTION public.%I(%s) SECURITY DEFINER;', rec.proname, rec.sig);
    EXECUTE format('ALTER FUNCTION public.%I(%s) OWNER TO postgres;', rec.proname, rec.sig);
  END LOOP;
END $$;

-- Observação: execute esta migration no Supabase SQL Editor com um usuário com privilégios.
