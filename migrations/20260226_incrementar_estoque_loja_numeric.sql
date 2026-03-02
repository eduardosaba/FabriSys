-- Função UPSERT para incrementar estoque por (local_id, produto_id)
-- Garante criação do registro se não existir e soma a quantidade se existir
CREATE OR REPLACE FUNCTION incrementar_estoque_loja_numeric(
    p_local_id UUID,
    p_produto_id UUID,
    p_quantidade DECIMAL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO estoque_produtos (local_id, produto_id, quantidade, updated_at)
    VALUES (p_local_id, p_produto_id, p_quantidade, NOW())
    ON CONFLICT (local_id, produto_id) 
    DO UPDATE SET 
        quantidade = estoque_produtos.quantidade + EXCLUDED.quantidade,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Observação: certifique-se de que exista UNIQUE(local_id, produto_id) na tabela estoque_produtos
