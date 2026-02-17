-- Migration: Criar tabelas de promoções e itens de promoção
-- Data: 2026-02-14

-- 1. Limpar tentativas anteriores (para evitar erro de "já existe")
DROP TABLE IF EXISTS public.promocao_itens CASCADE;
DROP TABLE IF EXISTS public.promocoes CASCADE;

-- 2. Criar Tabela de Promoções (Cabeçalho)
CREATE TABLE public.promocoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_fim TIMESTAMP WITH TIME ZONE,
    imagem_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar Tabela de Itens do Combo
CREATE TABLE public.promocao_itens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promocao_id UUID NOT NULL REFERENCES public.promocoes(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos_finais(id),
    quantidade NUMERIC(10,2) NOT NULL DEFAULT 1,
    valor_referencia_unitario NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- 4. Adicionar coluna na tabela de itens de venda (se não existir)
ALTER TABLE public.itens_venda
ADD COLUMN IF NOT EXISTS promocao_id UUID REFERENCES public.promocoes(id);

-- 5. Segurança (RLS)
ALTER TABLE public.promocoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocao_itens ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Acesso Promocoes" ON public.promocoes;
DROP POLICY IF EXISTS "Acesso Promocao Itens" ON public.promocao_itens;

-- Cria novas políticas
CREATE POLICY "Acesso Promocoes" ON public.promocoes FOR ALL TO authenticated
USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Acesso Promocao Itens" ON public.promocao_itens FOR ALL TO authenticated
USING (promocao_id IN (SELECT id FROM public.promocoes WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())));

-- Nota: Ajuste as políticas conforme necessário para permitir inserts/updates pela API do sistema.
