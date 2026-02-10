-- Migration: Criar tabela de tarefas da agenda
-- Data: 2025-12-15
-- Descrição: Tabela para armazenar tarefas manuais agendadas no calendário

-- Criar tabela tarefas_agenda
CREATE TABLE IF NOT EXISTS public.tarefas_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'outros' CHECK (tipo IN ('producao', 'financeiro', 'compras', 'manutencao', 'outros')),
  data_agendada DATE NOT NULL,
  horario TIME,
  concluido BOOLEAN NOT NULL DEFAULT false,
  detalhe TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tarefas_agenda_organization ON public.tarefas_agenda(organization_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_agenda_data ON public.tarefas_agenda(data_agendada);
CREATE INDEX IF NOT EXISTS idx_tarefas_agenda_tipo ON public.tarefas_agenda(tipo);
CREATE INDEX IF NOT EXISTS idx_tarefas_agenda_created_by ON public.tarefas_agenda(created_by);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_tarefas_agenda_updated_at
  BEFORE UPDATE ON public.tarefas_agenda
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.tarefas_agenda ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Usuários podem ver tarefas da sua organização
CREATE POLICY "Usuários podem visualizar tarefas da sua organização"
  ON public.tarefas_agenda
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: INSERT - Usuários podem criar tarefas na sua organização
CREATE POLICY "Usuários podem criar tarefas na sua organização"
  ON public.tarefas_agenda
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: UPDATE - Usuários podem atualizar tarefas da sua organização
CREATE POLICY "Usuários podem atualizar tarefas da sua organização"
  ON public.tarefas_agenda
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: DELETE - Usuários podem deletar tarefas da sua organização
CREATE POLICY "Usuários podem deletar tarefas da sua organização"
  ON public.tarefas_agenda
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Comentários
COMMENT ON TABLE public.tarefas_agenda IS 'Tarefas manuais agendadas no calendário da agenda';
COMMENT ON COLUMN public.tarefas_agenda.tipo IS 'Tipo da tarefa: producao, financeiro, compras, manutencao, outros';
COMMENT ON COLUMN public.tarefas_agenda.concluido IS 'Indica se a tarefa foi concluída';
