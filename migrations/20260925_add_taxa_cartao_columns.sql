-- Migration Idempotente: Criar ou Atualizar Tabela remessas_cargas_pdv e Adicionar Taxa de Cartão
-- Executar no Editor SQL do Supabase.

-- 1. Criar a tabela caso ainda não exista no projeto (sem dependência estrita de FK)
CREATE TABLE IF NOT EXISTS public.remessas_cargas_pdv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  local_id UUID,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  turno TEXT NOT NULL DEFAULT 'integral',
  vendedor_nome TEXT,
  modo_lancamento TEXT NOT NULL DEFAULT 'detalhado',
  tipo_fechamento TEXT DEFAULT 'individual',
  qtd_total_enviada INTEGER DEFAULT 0,
  qtd_total_retorno INTEGER DEFAULT 0,
  preco_medio_rapido NUMERIC(10,2) DEFAULT 0.00,
  itens_grade JSONB DEFAULT '[]'::JSONB,
  ajustes_perdas JSONB DEFAULT '[]'::JSONB,
  total_descontos_perdas NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  valor_dinheiro_gaveta NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  faturamento_bruto_teorico NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  faturamento_liquido_esperado NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  pix_cartao_esperado NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  valor_pix_declarado NUMERIC(10,2) DEFAULT 0.00,
  valor_cartao_declarado NUMERIC(10,2) DEFAULT 0.00,
  taxa_cartao_reais NUMERIC(10,2) DEFAULT 0.00,
  taxa_cartao_percentual NUMERIC(5,2) DEFAULT 0.00,
  diferenca_auditoria NUMERIC(10,2) DEFAULT 0.00,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'aberto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Garantir a inclusão das novas colunas caso a tabela já existisse
ALTER TABLE public.remessas_cargas_pdv
  ADD COLUMN IF NOT EXISTS taxa_cartao_reais NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE public.remessas_cargas_pdv
  ADD COLUMN IF NOT EXISTS taxa_cartao_percentual NUMERIC(5,2) DEFAULT 0.00;

ALTER TABLE public.remessas_cargas_pdv
  ADD COLUMN IF NOT EXISTS tipo_fechamento TEXT DEFAULT 'individual';

ALTER TABLE public.remessas_cargas_pdv
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 3. Índices de performance (com verificação de colunas)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'remessas_cargas_pdv' AND column_name = 'organization_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_remessas_cargas_local_data 
      ON public.remessas_cargas_pdv(organization_id, local_id, data);
  END IF;
END $$;

-- 4. Habilitar RLS (Políticas de Segurança)
ALTER TABLE public.remessas_cargas_pdv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso por organizacao remessas_cargas" ON public.remessas_cargas_pdv;

CREATE POLICY "Acesso por organizacao remessas_cargas" ON public.remessas_cargas_pdv
  FOR ALL USING (true);
