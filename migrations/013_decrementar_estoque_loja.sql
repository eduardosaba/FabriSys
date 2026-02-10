-- =========================================================================
-- Script: Criar função RPC decrementar_estoque_loja e tabela estoque_produtos
-- Execute este script no SQL Editor do Supabase
-- =========================================================================

-- 1. Tabela de estoques por loja/produto (se ainda não existir)
CREATE TABLE IF NOT EXISTS estoque_produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES produtos_finais(id) ON DELETE CASCADE,
  local_id UUID REFERENCES locais(id) ON DELETE CASCADE,
  quantidade NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(produto_id, local_id)
);

-- 2. Index para consultas por local/produto
CREATE INDEX IF NOT EXISTS idx_estoque_produto_local ON estoque_produtos(produto_id, local_id);

-- 3. Função RPC para decrementar o estoque de forma segura
CREATE OR REPLACE FUNCTION decrementar_estoque_loja(
  p_local_id UUID,
  p_produto_id UUID,
  p_qtd NUMERIC
) RETURNS VOID AS $$
BEGIN
  -- Tenta atualizar a linha existente
  UPDATE estoque_produtos
  SET quantidade = GREATEST(0, quantidade - p_qtd),
      updated_at = NOW()
  WHERE produto_id = p_produto_id AND local_id = p_local_id;

  -- Se não existia linha, criamos uma com quantidade reduzida (clampada a 0)
  IF NOT FOUND THEN
    INSERT INTO estoque_produtos (produto_id, local_id, quantidade, updated_at)
    VALUES (p_produto_id, p_local_id, GREATEST(0, 0 - p_qtd), NOW())
    ON CONFLICT (produto_id, local_id) DO UPDATE
      SET quantidade = GREATEST(0, estoque_produtos.quantidade - p_qtd),
          updated_at = NOW();
  END IF;

  RETURN;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro ao decrementar estoque: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 4. Observação: Dependendo das necessidades de RLS/permissions do seu projeto,
-- você pode precisar conceder permissões específicas ou ajustar a função para
-- usar SECURITY DEFINER. Por enquanto, esta função é criada com o comportamento
-- padrão (rodando com o papel do owner do schema).
