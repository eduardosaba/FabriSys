BEGIN;

-- 1. Categorias de Despesas (DRE)
CREATE TABLE IF NOT EXISTS public.fin_categorias_despesa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    nome TEXT NOT NULL,
    cor TEXT DEFAULT '#cbd5e1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela Principal de Contas a Pagar
CREATE TABLE IF NOT EXISTS public.fin_contas_pagar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    descricao TEXT NOT NULL,
    fornecedor_id UUID REFERENCES public.fornecedores(id),
    categoria_id UUID REFERENCES public.fin_categorias_despesa(id),
    valor_total NUMERIC(10,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
    forma_pagamento TEXT CHECK (forma_pagamento IN ('pix', 'boleto', 'cartao_credito', 'dinheiro', 'transferencia')),
    numero_documento TEXT,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE public.fin_categorias_despesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_contas_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contas Pagar Policy" ON public.fin_contas_pagar
FOR ALL TO authenticated USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Fin Categorias Policy" ON public.fin_categorias_despesa
FOR ALL TO authenticated USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

COMMIT;
