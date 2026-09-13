-- Migration: Tabela de Romaneio de Cargas e Fechamento de Turno por PDV
CREATE TABLE IF NOT EXISTS public.remessas_cargas_pdv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES public.locais(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  turno TEXT NOT NULL DEFAULT 'integral' CHECK (turno IN ('manha', 'tarde', 'noite', 'integral')),
  vendedor_nome TEXT,
  modo_lancamento TEXT NOT NULL DEFAULT 'detalhado' CHECK (modo_lancamento IN ('rapido', 'detalhado')),

  -- Modo Rápido (Totais Globais)
  qtd_total_enviada INTEGER DEFAULT 0,
  qtd_total_retorno INTEGER DEFAULT 0,
  preco_medio_rapido NUMERIC(10,2) DEFAULT 0.00,

  -- Modo Detalhado (Romaneio - Caderno Digital)
  -- Formato: [{"produto_id": "...", "nome": "Brownie", "qtd_enviada": 40, "qtd_retorno": 10, "preco_unitario": 8.00}]
  itens_grade JSONB DEFAULT '[]'::JSONB,

  -- Ajustes de Turno (Perdas, Avarias, Brindes, Descontos)
  -- Formato: [{"motivo": "queda", "descricao": "1 brownie avariado", "valor_ajuste": 8.00}]
  ajustes_perdas JSONB DEFAULT '[]'::JSONB,
  total_descontos_perdas NUMERIC(10,2) NOT NULL DEFAULT 0.00,

  -- Financeiro da Gaveta do Vendedor
  valor_dinheiro_gaveta NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  
  -- Valores Consolidados Calculados
  faturamento_bruto_teorico NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  faturamento_liquido_esperado NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  pix_cartao_esperado NUMERIC(10,2) NOT NULL DEFAULT 0.00, -- (Liquido - Dinheiro)

  -- Informados na conciliação noturna (opcional por turno ou global)
  valor_pix_declarado NUMERIC(10,2) DEFAULT 0.00,
  valor_cartao_declarado NUMERIC(10,2) DEFAULT 0.00,
  diferenca_auditoria NUMERIC(10,2) DEFAULT 0.00,

  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'encerrado', 'auditado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir coluna updated_at em tabelas legadas
ALTER TABLE public.remessas_cargas_pdv ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índices
CREATE INDEX IF NOT EXISTS idx_remessas_cargas_local_data ON public.remessas_cargas_pdv(organization_id, local_id, data);

-- RLS
ALTER TABLE public.remessas_cargas_pdv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso por organizacao remessas_cargas" ON public.remessas_cargas_pdv;

CREATE POLICY "Acesso por organizacao remessas_cargas" ON public.remessas_cargas_pdv
  FOR ALL USING (
    organization_id = auth.uid() OR organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );
