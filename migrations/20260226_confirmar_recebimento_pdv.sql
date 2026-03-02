-- DROP possíveis assinaturas antigas para evitar conflito de tipos
DROP FUNCTION IF EXISTS confirmar_recebimento_pdv(uuid, numeric, text);
DROP FUNCTION IF EXISTS confirmar_recebimento_pdv(uuid, decimal, text);

-- Função principal para confirmar recebimento no PDV
CREATE OR REPLACE FUNCTION confirmar_recebimento_pdv(
    p_distribuicao_id UUID,
    p_quantidade DECIMAL,
    p_observacao TEXT
) RETURNS VOID AS $$
DECLARE
    v_local_id UUID;
    v_produto_id UUID;
    v_qtd_enviada DECIMAL;
BEGIN
    -- Busca os dados necessários
    SELECT d.local_destino_id, o.produto_final_id, d.quantidade_solicitada
    INTO v_local_id, v_produto_id, v_qtd_enviada
    FROM distribuicao_pedidos d
    JOIN ordens_producao o ON d.ordem_producao_id = o.id
    WHERE d.id = p_distribuicao_id;

    -- Atualiza o Estoque Específico da Loja
    PERFORM incrementar_estoque_loja_numeric(v_local_id, v_produto_id, p_quantidade);

    -- Registra a Divergência (Quebra) se houver
    IF p_quantidade < v_qtd_enviada THEN
        INSERT INTO perdas_estoque (produto_id, local_id, quantidade, motivo, created_at)
        VALUES (v_produto_id, v_local_id, (v_qtd_enviada - p_quantidade), 'Divergência no Recebimento: ' || COALESCE(p_observacao, 'Sem observação'), NOW());
    END IF;

    -- Atualiza Status
    UPDATE distribuicao_pedidos SET status = 'recebido' WHERE id = p_distribuicao_id;
    
    UPDATE ordens_producao SET status_logistica = 'entregue' 
    WHERE id = (SELECT ordem_producao_id FROM distribuicao_pedidos WHERE id = p_distribuicao_id);
END;
$$ LANGUAGE plpgsql;
