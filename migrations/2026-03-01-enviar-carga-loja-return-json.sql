-- Migration: enviar_carga_loja returns json (business-flow responses)
-- Created: 2026-03-01

BEGIN;

DROP FUNCTION IF EXISTS public.enviar_carga_loja(uuid, numeric, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.enviar_carga_loja(
    p_produto_id uuid,
    p_quantidade numeric,
    p_local_origem_id uuid,
    p_local_destino_id uuid,
    p_ordem_producao_id uuid DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_saldo_atual numeric;
    v_org_id uuid;
    v_distrib_id uuid;
BEGIN
    -- Validações básicas
    IF p_produto_id IS NULL OR p_quantidade IS NULL OR p_quantidade <= 0 OR p_local_origem_id IS NULL OR p_local_destino_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Parâmetros inválidos para enviar_carga_loja');
    END IF;

    -- Verifica existência de estoque por local
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='local_id') THEN
        SELECT quantidade INTO v_saldo_atual
        FROM public.estoque_produtos
        WHERE produto_id = p_produto_id AND local_id = p_local_origem_id
        LIMIT 1;
    ELSE
        SELECT quantidade, organization_id INTO v_saldo_atual, v_org_id
        FROM public.estoque_produtos
        WHERE produto_id = p_produto_id AND organization_id = (SELECT organization_id FROM public.locais WHERE id = p_local_origem_id LIMIT 1)
        LIMIT 1;
    END IF;

    IF v_saldo_atual IS NULL OR v_saldo_atual < p_quantidade THEN
        RETURN json_build_object('success', false, 'message', format('Estoque insuficiente na fábrica. Disponível: %s', COALESCE(v_saldo_atual,0)));
    END IF;

    -- Debita na origem (atômico via UPDATE com condição)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='local_id') THEN
        UPDATE public.estoque_produtos
        SET quantidade = quantidade - p_quantidade,
            updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE updated_at END
        WHERE produto_id = p_produto_id AND local_id = p_local_origem_id AND quantidade >= p_quantidade;
    ELSE
        UPDATE public.estoque_produtos
        SET quantidade = quantidade - p_quantidade,
            updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE updated_at END
        WHERE produto_id = p_produto_id AND organization_id = (SELECT organization_id FROM public.locais WHERE id = p_local_origem_id LIMIT 1) AND quantidade >= p_quantidade;
    END IF;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Falha ao debitar estoque na origem');
    END IF;

    -- Credita no destino (upsert)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='local_id') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='created_at') THEN
            INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade, organization_id, created_at, updated_at)
            VALUES (p_produto_id, p_local_destino_id, p_quantidade, (SELECT organization_id FROM public.locais WHERE id = p_local_destino_id LIMIT 1), NOW(), NOW())
            ON CONFLICT (produto_id, local_id) DO UPDATE
            SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade,
                updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE public.estoque_produtos.updated_at END;
        ELSE
            INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade, organization_id)
            VALUES (p_produto_id, p_local_destino_id, p_quantidade, (SELECT organization_id FROM public.locais WHERE id = p_local_destino_id LIMIT 1))
            ON CONFLICT (produto_id, local_id) DO UPDATE
            SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade;
        END IF;
    ELSE
        -- fallback por organization_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='created_at') THEN
            INSERT INTO public.estoque_produtos (produto_id, organization_id, quantidade, created_at, updated_at)
            VALUES (p_produto_id, (SELECT organization_id FROM public.locais WHERE id = p_local_destino_id LIMIT 1), p_quantidade, NOW(), NOW())
            ON CONFLICT (produto_id, organization_id) DO UPDATE
            SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade,
                updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE public.estoque_produtos.updated_at END;
        ELSE
            INSERT INTO public.estoque_produtos (produto_id, organization_id, quantidade)
            VALUES (p_produto_id, (SELECT organization_id FROM public.locais WHERE id = p_local_destino_id LIMIT 1), p_quantidade)
            ON CONFLICT (produto_id, organization_id) DO UPDATE
            SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade;
        END IF;
    END IF;

    -- Inserir registro de distribuição (inclui created_at somente se existir)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='created_at') THEN
        INSERT INTO public.distribuicao_pedidos (produto_id, quantidade_solicitada, local_origem_id, local_destino_id, ordem_producao_id, status, created_at)
        VALUES (p_produto_id, p_quantidade, p_local_origem_id, p_local_destino_id, p_ordem_producao_id, 'enviado', NOW())
        RETURNING id INTO v_distrib_id;
    ELSE
        INSERT INTO public.distribuicao_pedidos (produto_id, quantidade_solicitada, local_origem_id, local_destino_id, ordem_producao_id, status)
        VALUES (p_produto_id, p_quantidade, p_local_origem_id, p_local_destino_id, p_ordem_producao_id, 'enviado')
        RETURNING id INTO v_distrib_id;
    END IF;

    -- Nota: não atualizamos `ordens_producao.status_logistica` aqui para evitar violar
    -- constraints de banco (ex: ordens_producao_status_logistica_check). A atualização
    -- do status logístico deve ser feita pela aplicação (frontend) após confirmação,
    -- respeitando os valores permitidos pelo esquema/constraint.

    RETURN json_build_object('success', true, 'message', 'Carga enviada com sucesso', 'distribuicao_id', v_distrib_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Erro crítico no banco: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.enviar_carga_loja(uuid, numeric, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_carga_loja(uuid, numeric, uuid, uuid, uuid) TO anon;

COMMIT;

-- After applying: restart DB in Supabase Console to refresh PostgREST cache.
