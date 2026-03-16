-- Migration: função de trigger e triggers para manter `updated_at` automaticamente
-- Recomendações: faça backup antes de aplicar. Este script adiciona colunas created_at/updated_at se ausentes.

-- 1) Função genérica que atualiza updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Adicionar colunas `created_at` e `updated_at` se não existirem (não altera dados existentes)
ALTER TABLE IF EXISTS public.insumos ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.insumos ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.estoque_produtos ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.estoque_produtos ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.ordens_producao ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.ordens_producao ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.movimentacao_estoque ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.movimentacao_estoque ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3) Criar triggers (drop antes se já existirem)
DROP TRIGGER IF EXISTS set_updated_at_insumos ON public.insumos;
CREATE TRIGGER set_updated_at_insumos
BEFORE UPDATE ON public.insumos
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_estoque_produtos ON public.estoque_produtos;
CREATE TRIGGER set_updated_at_estoque_produtos
BEFORE UPDATE ON public.estoque_produtos
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_ordens_producao ON public.ordens_producao;
CREATE TRIGGER set_updated_at_ordens_producao
BEFORE UPDATE ON public.ordens_producao
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_movimentacao_estoque ON public.movimentacao_estoque;
CREATE TRIGGER set_updated_at_movimentacao_estoque
BEFORE UPDATE ON public.movimentacao_estoque
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4) Observações
-- - Esta migration é segura para aplicar: cria coluna apenas se ausente e substitui triggers antigas.
-- - Se preferir, posso estender para outras tabelas (ex: distribuicao_pedidos, vendas, pedidos).
-- - Execute em ambiente de staging primeiro.
