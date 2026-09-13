-- Migration: Tabela de Acertos Rápidos e Auditoria Anti-Fraude por PDV e Turno
CREATE TABLE IF NOT EXISTS public.acertos_pdv_turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES public.locais(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  turno TEXT NOT NULL DEFAULT 'integral' CHECK (turno IN ('manha', 'tarde', 'noite', 'integral')),
  vendedor_nome TEXT,
  
  -- Volumes Físicos
  qtd_enviada INTEGER NOT NULL DEFAULT 0,
  qtd_retorno INTEGER NOT NULL DEFAULT 0,
  qtd_vendida INTEGER GENERATED ALWAYS AS (GREATEST(0, qtd_enviada - qtd_retorno)) STORED,
  
  -- Valor Teórico Esperado
  preco_unitario_estimado NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  valor_esperado_total NUMERIC(10,2) GENERATED ALWAYS AS ((GREATEST(0, qtd_enviada - qtd_retorno)) * preco_unitario_estimado) STORED,
  
  -- Recebimentos Declarados pelo Ponto
  valor_dinheiro NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  valor_pix NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  valor_cartao NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  valor_recebido_total NUMERIC(10,2) GENERATED ALWAYS AS (valor_dinheiro + valor_pix + valor_cartao) STORED,
  
  -- Auditoria Financeira
  diferenca_caixa NUMERIC(10,2) GENERATED ALWAYS AS ((valor_dinheiro + valor_pix + valor_cartao) - ((GREATEST(0, qtd_enviada - qtd_retorno)) * preco_unitario_estimado)) STORED,
  status_auditoria TEXT NOT NULL DEFAULT 'pendente' CHECK (status_auditoria IN ('ok', 'sobra', 'furo_caixa', 'pendente', 'conferido')),
  
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de busca rápida
CREATE INDEX IF NOT EXISTS idx_acertos_pdv_org_data ON public.acertos_pdv_turnos(organization_id, data);
CREATE INDEX IF NOT EXISTS idx_acertos_pdv_local ON public.acertos_pdv_turnos(local_id);

-- RLS
ALTER TABLE public.acertos_pdv_turnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso por organizacao acertos_pdv" ON public.acertos_pdv_turnos;

CREATE POLICY "Acesso por organizacao acertos_pdv" ON public.acertos_pdv_turnos
  FOR ALL USING (
    organization_id = auth.uid() OR organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );
