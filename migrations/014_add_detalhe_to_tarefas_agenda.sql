-- Migration: 014_add_detalhe_to_tarefas_agenda.sql
-- Adiciona coluna `detalhe` em public.tarefas_agenda se não existir
-- e popula com o valor de `descricao` quando presente

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tarefas_agenda' AND column_name = 'detalhe'
  ) THEN
    ALTER TABLE public.tarefas_agenda
      ADD COLUMN detalhe TEXT;
  END IF;

  -- Se existir coluna `descricao`, copie para `detalhe` onde `detalhe` for NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tarefas_agenda' AND column_name = 'descricao'
  ) THEN
    UPDATE public.tarefas_agenda
    SET detalhe = descricao
    WHERE detalhe IS NULL AND descricao IS NOT NULL;
  END IF;
END
$$;

-- Verificação sugerida:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'tarefas_agenda';
