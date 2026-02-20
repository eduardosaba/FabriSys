-- Migration: update enviar_carga_loja and confirmar_recebimento_pdv RPCs
-- Created: 2026-02-19
-- Idempotent: replaces functions safely

BEGIN;

-- Replace enviar_carga_loja to mark OP as 'enviado' when applicable
DROP FUNCTION IF EXISTS public.enviar_carga_loja(uuid, numeric, uuid, uuid, uuid);
CREATE OR REPLACE FUNCTION public.enviar_carga_loja(
  p_produto_id uuid,
  p_quantidade numeric,
  p_local_origem_id uuid,
  p_local_destino_id uuid,
  p_ordem_producao_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_estoque_atual numeric;
  v_distribuicao_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='estoque_produtos'
  ) THEN
    RAISE EXCEPTION 'Tabela estoque_produtos não existe. Verifique o schema.';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='local_id') THEN
    SELECT quantidade INTO v_estoque_atual
    FROM public.estoque_produtos
    WHERE produto_id = p_produto_id AND local_id = p_local_origem_id
    FOR UPDATE;

    IF v_estoque_atual IS NULL OR v_estoque_atual < p_quantidade THEN
      RAISE EXCEPTION 'Estoque insuficiente na origem. Disponível: %', COALESCE(v_estoque_atual, 0);
    END IF;

    UPDATE public.estoque_produtos
    SET quantidade = quantidade - p_quantidade, updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE NULL END
    WHERE produto_id = p_produto_id AND local_id = p_local_origem_id;
  ELSE
    SELECT quantidade INTO v_estoque_atual
    FROM public.estoque_produtos
    WHERE produto_id = p_produto_id AND organization_id = (SELECT organization_id FROM public.locais WHERE id = p_local_origem_id LIMIT 1)
    FOR UPDATE;

    IF v_estoque_atual IS NULL OR v_estoque_atual < p_quantidade THEN
      RAISE EXCEPTION 'Estoque insuficiente na origem (org). Disponível: %', COALESCE(v_estoque_atual, 0);
    END IF;

    UPDATE public.estoque_produtos
    SET quantidade = quantidade - p_quantidade
    WHERE produto_id = p_produto_id AND organization_id = (SELECT organization_id FROM public.locais WHERE id = p_local_origem_id LIMIT 1);
  END IF;

  INSERT INTO public.distribuicao_pedidos (
    produto_id, quantidade_solicitada, local_origem_id, local_destino_id, ordem_producao_id, status, created_at
  ) VALUES (
    p_produto_id, p_quantidade, p_local_origem_id, p_local_destino_id, p_ordem_producao_id, 'enviado', now()
  ) RETURNING id INTO v_distribuicao_id;

  -- Se esta distribuição estiver ligada a uma OP, marque a OP como 'enviado' (transição pendente->enviado)
  IF p_ordem_producao_id IS NOT NULL THEN
    UPDATE public.ordens_producao
    SET status_logistica = 'enviado', updated_at = NOW()
    WHERE id = p_ordem_producao_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_distribuicao_id);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro na expedição: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace confirmar_recebimento_pdv to credit stock, ledger and mark OP as received when all distribs done
DROP FUNCTION IF EXISTS public.confirmar_recebimento_pdv(uuid, numeric, text);
CREATE OR REPLACE FUNCTION public.confirmar_recebimento_pdv(
  p_distribuicao_id uuid,
  p_quantidade numeric DEFAULT NULL,
  p_observacao text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_produto_id uuid;
  v_quant_solicitada numeric;
  v_local_destino uuid;
  v_status text;
  v_ordem_id uuid;
  v_q numeric;
  v_mov_id uuid := gen_random_uuid();
BEGIN
  SELECT produto_id, quantidade_solicitada, local_destino_id, status, ordem_producao_id
  INTO v_produto_id, v_quant_solicitada, v_local_destino, v_status, v_ordem_id
  FROM public.distribuicao_pedidos
  WHERE id = p_distribuicao_id
  FOR UPDATE;

  IF v_produto_id IS NULL THEN
    RAISE EXCEPTION 'Distribuição não encontrada: %', p_distribuicao_id;
  END IF;

  IF v_status = 'recebido' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Já recebido');
  END IF;

  IF p_quantidade IS NULL THEN
    v_q := v_quant_solicitada;
  ELSE
    v_q := p_quantidade;
  END IF;

  -- Creditar em estoque_produtos (upsert)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque_produtos') THEN
    IF EXISTS (SELECT 1 FROM public.estoque_produtos WHERE produto_id = v_produto_id AND local_id = v_local_destino) THEN
      UPDATE public.estoque_produtos
      SET quantidade = quantidade + v_q,
          updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE NULL END
      WHERE produto_id = v_produto_id AND local_id = v_local_destino;
    ELSE
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='created_at') THEN
        INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade, created_at)
        VALUES (v_produto_id, v_local_destino, v_q, NOW());
      ELSE
        INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade)
        VALUES (v_produto_id, v_local_destino, v_q);
      END IF;
    END IF;
  END IF;

  -- Registrar movimentação no ledger se a tabela existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='movimentacao_estoque') THEN
    INSERT INTO public.movimentacao_estoque (id, produto_id, quantidade, tipo_movimento, origem, destino, referencia_id, created_at)
    VALUES (v_mov_id, v_produto_id, v_q, 'entrada', NULL, v_local_destino::text, v_ordem_id, NOW());
  END IF;

  -- Atualizar status na distribuição para 'recebido' e campos auxiliares
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='quantidade_recebida') THEN
    UPDATE public.distribuicao_pedidos
    SET status = 'recebido',
        quantidade_recebida = COALESCE(v_q, quantidade_recebida),
        observacao = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='observacao') THEN COALESCE(p_observacao, observacao) ELSE NULL END,
        received_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='received_at') THEN NOW() ELSE NULL END,
        updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='updated_at') THEN NOW() ELSE NULL END
    WHERE id = p_distribuicao_id;
  ELSE
    UPDATE public.distribuicao_pedidos
    SET status = 'recebido',
        observacao = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='observacao') THEN COALESCE(p_observacao, NULL) ELSE NULL END,
        received_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='received_at') THEN NOW() ELSE NULL END,
        updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='updated_at') THEN NOW() ELSE NULL END
    WHERE id = p_distribuicao_id;
  END IF;

  -- Se esta distribuição pertence a uma OP, verificar se todas as distribuições desta OP foram recebidas
  IF v_ordem_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.distribuicao_pedidos WHERE ordem_producao_id = v_ordem_id AND status <> 'recebido'
    ) THEN
      UPDATE public.ordens_producao
      SET status_logistica = 'recebido', updated_at = NOW()
      WHERE id = v_ordem_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'produto_id', v_produto_id, 'quantidade', v_q, 'distribuicao_id', p_distribuicao_id);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro ao confirmar recebimento PDV: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.enviar_carga_loja(uuid, numeric, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_carga_loja(uuid, numeric, uuid, uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.confirmar_recebimento_pdv(uuid, numeric, text) TO anon;
GRANT EXECUTE ON FUNCTION public.confirmar_recebimento_pdv(uuid, numeric, text) TO authenticated;

COMMIT;
