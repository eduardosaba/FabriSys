-- Migration: cria view segura `v_ordens_producao_pdv` que exclui colunas sensíveis
BEGIN;

DO $$
DECLARE
  cols TEXT;
  qry TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
  INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'ordens_producao'
    AND column_name NOT IN ('estoque_seguranca', 'quantidade_enviada_extra');

  IF cols IS NULL THEN
    RAISE NOTICE 'ordens_producao não encontrada ou sem colunas.';
    RETURN;
  END IF;

  qry := format('CREATE OR REPLACE VIEW public.v_ordens_producao_pdv AS SELECT %s FROM public.ordens_producao;', cols);
  EXECUTE qry;
END$$;

-- Garantir permissões: permitir leitura da view para usuários autenticados (PDVs usarão essa view)
GRANT SELECT ON public.v_ordens_producao_pdv TO authenticated;
GRANT SELECT ON public.v_ordens_producao_pdv TO anon;

COMMIT;

-- Observação: esta view é uma cópia dos campos públicos de `ordens_producao`, sem os campos
-- `estoque_seguranca` e `quantidade_enviada_extra`. Atualize consultas do PDV para usar
-- `v_ordens_producao_pdv` quando quiser esconder essas colunas.
