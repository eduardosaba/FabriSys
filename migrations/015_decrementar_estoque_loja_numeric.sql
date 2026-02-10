-- =========================================================================
-- Criar função RPC `decrementar_estoque_loja_numeric` para evitar ambiguidade
-- entre overloads existentes de `decrementar_estoque_loja`.
-- Execute no Supabase SQL Editor após as outras migrations.
-- =========================================================================

CREATE OR REPLACE FUNCTION decrementar_estoque_loja_numeric(
  p_local_id UUID,
  p_produto_id UUID,
  p_qtd NUMERIC
) RETURNS VOID AS $$
BEGIN
  UPDATE estoque_produtos
  SET quantidade = GREATEST(0, quantidade - p_qtd),
      updated_at = NOW()
  WHERE produto_id = p_produto_id AND local_id = p_local_id;

  IF NOT FOUND THEN
    INSERT INTO estoque_produtos (produto_id, local_id, quantidade, updated_at)
    VALUES (p_produto_id, p_local_id, GREATEST(0, 0 - p_qtd), NOW())
    ON CONFLICT (produto_id, local_id) DO UPDATE
      SET quantidade = GREATEST(0, estoque_produtos.quantidade - p_qtd),
          updated_at = NOW();
  END IF;

  RETURN;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro ao decrementar estoque (numeric): %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Marcar como SECURITY DEFINER se desejar (opcional)
ALTER FUNCTION decrementar_estoque_loja_numeric(UUID, UUID, NUMERIC) SECURITY DEFINER;
