-- Função blindada para processar saída de expedição
CREATE OR REPLACE FUNCTION public.processar_saida_expedicao(
    p_produto_id uuid,
    p_quantidade numeric,
    p_fabrica_id uuid,
    p_pdv_id uuid,
    p_org_id uuid
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_saldo_atual numeric;
BEGIN
    -- 1. Verifica saldo exato na fábrica informada
    SELECT quantidade INTO v_saldo_atual 
    FROM estoque_produtos 
    WHERE local_id = p_fabrica_id AND produto_id = p_produto_id;

    -- 2. Se não encontrar registro ou saldo for insuficiente
    IF v_saldo_atual IS NULL OR v_saldo_atual < p_quantidade THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Saldo insuficiente na fábrica. Disponível: ' || COALESCE(v_saldo_atual, 0) || ' un.'
        );
    END IF;

    -- 3. Executa a transferência
    -- Tira da Fábrica
    UPDATE estoque_produtos 
    SET quantidade = quantidade - p_quantidade, updated_at = now()
    WHERE local_id = p_fabrica_id AND produto_id = p_produto_id;

    -- Soma no PDV
    INSERT INTO estoque_produtos (local_id, produto_id, quantidade, organization_id, updated_at)
    VALUES (p_pdv_id, p_produto_id, p_quantidade, p_org_id, now())
    ON CONFLICT (local_id, produto_id) 
    DO UPDATE SET 
        quantidade = estoque_produtos.quantidade + EXCLUDED.quantidade,
        updated_at = now();

    RETURN json_build_object('success', true, 'message', 'Saída processada com sucesso.');

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Erro interno: ' || SQLERRM);
END;
$$;
