-- Migration: cria função atômica finalizar_conferencia_caixa
BEGIN;

CREATE OR REPLACE FUNCTION public.finalizar_conferencia_caixa(
    p_fechamento_id UUID,
    p_pix NUMERIC,
    p_cartao NUMERIC,
    p_ajuste_promo NUMERIC,
    p_observacao TEXT,
    p_admin_id UUID
) RETURNS VOID AS $$
DECLARE
    r_item RECORD;
BEGIN
    -- 1. Verificar se o caixa já não foi fechado para evitar duplicidade
    IF EXISTS (SELECT 1 FROM public.pos_fechamentos WHERE id = p_fechamento_id AND status_conferencia = 'concluido') THEN
        RAISE EXCEPTION 'Este caixa já foi conferido e encerrado.';
    END IF;

    -- 2. Atualizar a tabela principal de fechamento
    UPDATE public.pos_fechamentos
    SET 
        valor_pix_conferencia = COALESCE(p_pix,0),
        valor_cartao_conferencia = COALESCE(p_cartao,0),
        ajuste_global_promocoes = COALESCE(p_ajuste_promo,0),
        observacoes_admin = p_observacao,
        status_conferencia = 'concluido',
        admin_conferente_id = p_admin_id,
        data_conferencia = NOW(),
        status = 'concluido'
    WHERE id = p_fechamento_id;

    -- 3. Baixa de estoque e log de movimentação
    FOR r_item IN 
        SELECT produto_id, local_id, qtd_vendida
        FROM public.itens_fechamento_caixa
        WHERE fechamento_id = p_fechamento_id
    LOOP
        -- Subtrair do estoque do PDV
        UPDATE public.estoque_produtos
        SET quantidade = quantidade - r_item.qtd_vendida
        WHERE produto_id = r_item.produto_id AND local_id = r_item.local_id;

        -- Registrar histórico para o relatório de auditoria
        INSERT INTO public.movimentacao_estoque (
            produto_id, 
            local_id, 
            quantidade, 
            tipo_movimentacao, 
            descricao,
            origem_id,
            created_at
        ) VALUES (
            r_item.produto_id, 
            r_item.local_id, 
            r_item.qtd_vendida, 
            'saida_venda', 
            'Venda confirmada via inventário cego',
            p_fechamento_id,
            NOW()
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- OBS: Ajuste nomes de tabelas/colunas se necessário para seu schema.
