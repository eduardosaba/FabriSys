-- Migration: Corrigir trigger da tabela tarefas_agenda
-- Data: 2025-12-15
-- Descrição: Garante que a função update_updated_at_column existe e recria o trigger

-- Adicionar coluna updated_at se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tarefas_agenda' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.tarefas_agenda ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Criar a função se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropar trigger se existir e recriar
DROP TRIGGER IF EXISTS update_tarefas_agenda_updated_at ON public.tarefas_agenda;

CREATE TRIGGER update_tarefas_agenda_updated_at
  BEFORE UPDATE ON public.tarefas_agenda
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
