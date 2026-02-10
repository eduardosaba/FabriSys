-- 073_backfill_quantidade_solicitacoes_reposicao.sql
-- Popula a coluna `quantidade` em `solicitacoes_reposicao` a partir do campo `observacao`.
-- Execute no Supabase SQL Editor ou via psql. O script é seguro: verifica existência da tabela.

DO $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'solicitacoes_reposicao'
  ) THEN

    -- Garante que a coluna exista
    ALTER TABLE public.solicitacoes_reposicao
      ADD COLUMN IF NOT EXISTS quantidade INTEGER;

    -- Backfill: tenta vários padrões comuns, do mais específico ao mais genérico
    UPDATE public.solicitacoes_reposicao
    SET quantidade = COALESCE(
      (regexp_matches(observacao, 'Quantidade solicitada:\\s*(\\d+)', 'i'))[1]::int,
      (regexp_matches(observacao, 'Qtd[:\\s]*\\s*(\\d+)', 'i'))[1]::int,
      (regexp_matches(observacao, 'qtd[:\\s]*\\s*(\\d+)', 'i'))[1]::int,
      (regexp_matches(observacao, '(\\d+)(?!.*\\d)', 'i'))[1]::int
    )
    WHERE observacao IS NOT NULL
      AND (quantidade IS NULL);

    -- Retorna quantas linhas agora tem `quantidade` preenchido
    SELECT count(*) INTO v_count FROM public.solicitacoes_reposicao WHERE quantidade IS NOT NULL;
    RAISE NOTICE 'Backfill concluído: % linhas com quantidade preenchida', v_count;

  ELSE
    RAISE NOTICE 'Tabela public.solicitacoes_reposicao não encontrada — pulando backfill.';
  END IF;
END$$;

-- Observações:
-- 1) Revise os padrões regex acima caso seus `observacao` usem outro formato.
-- 2) Se quiser ver as linhas afetadas antes de aplicar, execute primeiro:
--    SELECT id, observacao FROM public.solicitacoes_reposicao WHERE observacao ~* '(Quantidade solicitada:|Qtd|qtd|\\d+)';
-- 3) Após aplicar a migration, reinicie o Database no Console do Supabase (Settings -> Database -> Restart)
--    para garantir que PostgREST/Realtime atualizem o schema cache.
