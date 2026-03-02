-- Migration: criar função devolver_sobra_para_fabrica
-- Esta função transfere sobras do PDV de volta para a fábrica da organization
CREATE OR REPLACE FUNCTION public.devolver_sobra_para_fabrica(
    p_produto_id uuid,
    p_quantidade numeric,
    p_local_origem_id uuid,
    p_organization_id uuid
)
RETURNS json 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_local_fabrica_id uuid;
BEGIN
    -- 1. Localiza a Fábrica da organização
    SELECT id INTO v_local_fabrica_id FROM locais 
    WHERE organization_id = p_organization_id AND tipo = 'fabrica' LIMIT 1;

    IF v_local_fabrica_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Fábrica não encontrada.');
    END IF;

    -- 2. Tira do PDV (Zera a prateleira)
    UPDATE public.estoque_produtos 
    SET quantidade = quantidade - p_quantidade, updated_at = now()
    WHERE local_id = p_local_origem_id AND produto_id = p_produto_id;

    -- 3. Incrementa na Fábrica
    INSERT INTO public.estoque_produtos (local_id, produto_id, quantidade, organization_id, updated_at)
    VALUES (v_local_fabrica_id, p_produto_id, p_quantidade, p_organization_id, now())
    ON CONFLICT (local_id, produto_id) 
    DO UPDATE SET 
        quantidade = estoque_produtos.quantidade + EXCLUDED.quantidade,
        updated_at = now();

    -- 4. Registra a Movimentação para auditoria
    INSERT INTO public.movimentacoes_estoque (produto_id, local_id, quantidade, tipo, observacao, organization_id)
    VALUES (p_produto_id, p_local_origem_id, -p_quantidade, 'retorno_fabrica', 'Sobra de fechamento retornada à fábrica', p_organization_id);

    RETURN json_build_object('success', true);
END;
$$;
