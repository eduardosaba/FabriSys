-- Migration 082: cria tabela pos_fechamentos e altera tabela vendas

CREATE TABLE IF NOT EXISTS public.pos_fechamentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  usuario_id uuid REFERENCES public.profiles(id),
  data_abertura timestamptz DEFAULT now(),
  data_fechamento timestamptz,
  data_validacao timestamptz,
  valor_esperado_dinheiro numeric(12,2),
  valor_informado_dinheiro numeric(12,2),
  diferenca numeric(12,2),
  status text DEFAULT 'pendente' CHECK (status IN ('pendente','validado','ajustado')),
  observacoes text,
  created_at timestamptz DEFAULT now()
);

-- Adiciona colunas de validação na tabela de vendas
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS caixa_validado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fechamento_id uuid REFERENCES public.pos_fechamentos(id);
