-- Migration: receber_carga_pdv returns json (PDV receive flow)
-- Created: 2026-03-01

BEGIN;

DROP FUNCTION IF EXISTS public.receber_carga_pdv(uuid, numeric, uuid, uuid);

CREATE OR REPLACE FUNCTION public.receber_carga_pdv(
    p_distribuicao_id uuid,
    p_quantidade_recebida numeric,
    p_local_destino_id uuid,
    p_produto_id uuid
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_org_id uuid;
    v_distrib_exists boolean;
BEGIN
    -- Validações básicas
    IF p_distribuicao_id IS NULL OR p_local_destino_id IS NULL OR p_produto_id IS NULL OR p_quantidade_recebida IS NULL OR p_quantidade_recebida <= 0 THEN
        RETURN json_build_object('success', false, 'message', 'Parâmetros inválidos para receber_carga_pdv');
    END IF;

    SELECT EXISTS(SELECT 1 FROM public.distribuicao_pedidos WHERE id = p_distribuicao_id) INTO v_distrib_exists;
    IF NOT v_distrib_exists THEN
        RETURN json_build_object('success', false, 'message', 'Distribuição não encontrada');
    END IF;

    SELECT organization_id INTO v_org_id FROM public.locais WHERE id = p_local_destino_id LIMIT 1;
    IF v_org_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Local de destino inválido');
    END IF;

    -- Atualizar a distribuição: marcar como recebido e gravar quantidade_recebida quando a coluna existir
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='quantidade_recebida') THEN
      UPDATE public.distribuicao_pedidos
      SET status = 'recebido',
          quantidade_recebida = p_quantidade_recebida,
          updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='updated_at') THEN NOW() ELSE updated_at END
      WHERE id = p_distribuicao_id;
    ELSE
      UPDATE public.distribuicao_pedidos
      SET status = 'recebido',
          updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='updated_at') THEN NOW() ELSE updated_at END
      WHERE id = p_distribuicao_id;
    END IF;

    -- Creditar no estoque do PDV (inserir/upsert)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='local_id') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='created_at') THEN
                INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade, organization_id, created_at, updated_at)
                VALUES (p_produto_id, p_local_destino_id, p_quantidade_recebida, v_org_id, NOW(), NOW())
                ON CONFLICT (produto_id, local_id) DO UPDATE
                SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade,
                        updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE public.estoque_produtos.updated_at END;
            ELSE
                INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade, organization_id)
                VALUES (p_produto_id, p_local_destino_id, p_quantidade_recebida, v_org_id)
                ON CONFLICT (produto_id, local_id) DO UPDATE
                SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade;
            END IF;
        ELSE
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='created_at') THEN
                INSERT INTO public.estoque_produtos (produto_id, organization_id, quantidade, created_at, updated_at)
                VALUES (p_produto_id, v_org_id, p_quantidade_recebida, NOW(), NOW())
                ON CONFLICT (produto_id, organization_id) DO UPDATE
                SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade,
                        updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE public.estoque_produtos.updated_at END;
            ELSE
                INSERT INTO public.estoque_produtos (produto_id, organization_id, quantidade)
                VALUES (p_produto_id, v_org_id, p_quantidade_recebida)
                ON CONFLICT (produto_id, organization_id) DO UPDATE
                SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade;
            END IF;
        END IF;

    RETURN json_build_object('success', true, 'message', 'Carga recebida e estoque atualizado na loja!');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Erro ao processar recebimento: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.receber_carga_pdv(uuid, numeric, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receber_carga_pdv(uuid, numeric, uuid, uuid) TO anon;

COMMIT;

-- After applying: restart DB in Supabase Console to refresh PostgREST cache.
