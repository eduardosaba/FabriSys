-- Migration: ensure RPCs set status_logistica when finalizing orders
-- Created: 2026-02-19
-- This migration replaces the RPCs to also set `status_logistica` on ordens_producao

BEGIN;

-- Replace movimentar_ordem to set status_logistica appropriately
CREATE OR REPLACE FUNCTION public.movimentar_ordem(
  p_ordem_id uuid,
  p_novo_estagio text,
  p_novo_status text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_ord ordens_producao%ROWTYPE;
  v_produto_id uuid;
  v_tipo_prod text;
  v_insumo_id uuid;
  v_q numeric := 0;
BEGIN
  SELECT * INTO v_ord FROM public.ordens_producao WHERE id = p_ordem_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ordem não encontrada');
  END IF;

  v_produto_id := v_ord.produto_final_id;
  IF v_produto_id IS NOT NULL THEN
    SELECT tipo INTO v_tipo_prod FROM public.produtos_finais WHERE id = v_produto_id;
  END IF;

  IF v_tipo_prod IS NOT NULL AND v_tipo_prod = 'semi_acabado' AND p_novo_estagio IN ('concluido','finalizado') THEN
    v_q := COALESCE(v_ord.quantidade_produzida, v_ord.quantidade_prevista, 0);
    SELECT id INTO v_insumo_id FROM public.insumos WHERE produto_final_id = v_produto_id AND tipo_insumo = 'virtual' LIMIT 1;
    IF NOT FOUND THEN
      INSERT INTO public.insumos (nome, unidade_medida, unidade_estoque, unidade_consumo, fator_conversao, estoque_minimo_alerta, produto_final_id, tipo_insumo, created_at)
      VALUES (
        (SELECT nome || ' (Semi-Acabado)' FROM public.produtos_finais WHERE id = v_produto_id),
        'kg', 'KG', 'kg', 1, 0, v_produto_id, 'virtual', NOW()
      ) RETURNING id INTO v_insumo_id;
    END IF;

    IF v_insumo_id IS NOT NULL AND v_q > 0 THEN
      INSERT INTO public.lotes_insumos (insumo_id, quantidade_inicial, quantidade_restante, data_recebimento, created_at)
      VALUES (v_insumo_id, v_q, v_q, NOW()::date, NOW());
    END IF;

    -- Semi-acabado: finaliza sem passar por expedição (está sendo convertido em insumo)
    UPDATE public.ordens_producao
    SET status = 'finalizada', data_fim = NOW(), updated_at = NOW(), estagio_atual = p_novo_estagio, status_logistica = 'finalizada'
    WHERE id = p_ordem_id;

    RETURN jsonb_build_object('success', true, 'message', 'Ordem finalizada e estoque intermediário atualizado');
  END IF;

    -- Para produtos acabados, movendo para 'concluido' deve marcar logística como PENDENTE
    UPDATE public.ordens_producao
    SET estagio_atual = p_novo_estagio,
      updated_at = NOW(),
      status_logistica = CASE WHEN p_novo_estagio IN ('concluido','finalizado') AND (v_tipo_prod IS NULL OR v_tipo_prod <> 'semi_acabado') THEN 'pendente' ELSE COALESCE(status_logistica, 'pendente') END
    WHERE id = p_ordem_id;

  IF p_novo_status IS NOT NULL THEN
    UPDATE public.ordens_producao
    SET status = p_novo_status,
        updated_at = NOW(),
        data_fim = CASE WHEN p_novo_status IN ('finalizada','concluido') THEN NOW() ELSE data_fim END,
        status_logistica = CASE WHEN p_novo_status IN ('finalizada','concluido') AND (v_tipo_prod IS NULL OR v_tipo_prod <> 'semi_acabado') THEN 'pendente' ELSE COALESCE(status_logistica, 'pendente') END
    WHERE id = p_ordem_id;
  ELSE
    IF p_novo_estagio IN ('concluido','finalizado') THEN
      UPDATE public.ordens_producao
      SET status = 'finalizada', data_fim = NOW(), updated_at = NOW(), status_logistica = CASE WHEN (v_tipo_prod IS NULL OR v_tipo_prod <> 'semi_acabado') THEN 'pendente' ELSE 'finalizada' END
      WHERE id = p_ordem_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Ordem movida');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace finalizar_op_kanban to set status_logistica as well
CREATE OR REPLACE FUNCTION public.finalizar_op_kanban(
  p_op_id uuid,
  p_quantidade_produzida numeric
) RETURNS jsonb AS $$
DECLARE
  v_produto_id uuid;
  v_tipo_produto text;
  v_local_fabrica_id uuid;
  v_org_id uuid;
  v_exists boolean;
  v_mov_id uuid := gen_random_uuid();
BEGIN
  SELECT op.produto_final_id, pf.tipo, op.organization_id
  INTO v_produto_id, v_tipo_produto, v_org_id
  FROM public.ordens_producao op
  JOIN public.produtos_finais pf ON op.produto_final_id = pf.id
  WHERE op.id = p_op_id;

  IF v_produto_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'OP não encontrada ou produto não configurado');
  END IF;

  SELECT id INTO v_local_fabrica_id
  FROM public.locais
  WHERE organization_id = v_org_id AND (tipo = 'producao' OR tipo = 'fabrica')
  LIMIT 1;

  IF v_local_fabrica_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Local de fábrica/produção não encontrado para a organização');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.movimentacao_estoque WHERE referencia_id = p_op_id AND tipo_movimento = 'entrada_producao') INTO v_exists;
  IF v_exists THEN
    RETURN jsonb_build_object('success', true, 'message', 'OP já processada (movimentação existente)');
  END IF;

  UPDATE public.ordens_producao
  SET status = 'finalizada', estagio_atual = 'concluido', quantidade_produzida = COALESCE(quantidade_produzida, p_quantidade_produzida), status_logistica = 'finalizada'
  WHERE id = p_op_id;

  IF v_tipo_produto = 'semi_acabado' THEN
    IF EXISTS (SELECT 1 FROM public.insumos WHERE id = v_produto_id) THEN
      UPDATE public.insumos SET estoque_atual = estoque_atual + p_quantidade_produzida WHERE id = v_produto_id;
    END IF;
    INSERT INTO public.movimentacao_estoque (id, produto_id, quantidade, tipo_movimento, origem, destino, referencia_id, created_at)
    VALUES (v_mov_id, v_produto_id, p_quantidade_produzida, 'entrada_producao', 'producao', v_local_fabrica_id::text, p_op_id, now());

    RETURN jsonb_build_object('success', true, 'message', 'Produção semi-acabada finalizada e estoque de insumos atualizado');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='local_id') THEN
    IF EXISTS (SELECT 1 FROM public.estoque_produtos WHERE produto_id = v_produto_id AND local_id = v_local_fabrica_id) THEN
      UPDATE public.estoque_produtos SET quantidade = quantidade + p_quantidade_produzida WHERE produto_id = v_produto_id AND local_id = v_local_fabrica_id;
    ELSE
      INSERT INTO public.estoque_produtos (id, produto_id, local_id, quantidade)
      VALUES (gen_random_uuid(), v_produto_id, v_local_fabrica_id, p_quantidade_produzida);
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.estoque_produtos WHERE produto_id = v_produto_id AND organization_id = v_org_id) THEN
      UPDATE public.estoque_produtos SET quantidade = quantidade + p_quantidade_produzida WHERE produto_id = v_produto_id AND organization_id = v_org_id;
    ELSE
      INSERT INTO public.estoque_produtos (id, produto_id, organization_id, quantidade)
      VALUES (gen_random_uuid(), v_produto_id, v_org_id, p_quantidade_produzida);
    END IF;
  END IF;

  INSERT INTO public.movimentacao_estoque (id, produto_id, quantidade, tipo_movimento, origem, destino, referencia_id, created_at)
  VALUES (v_mov_id, v_produto_id, p_quantidade_produzida, 'entrada_producao', 'producao', v_local_fabrica_id::text, p_op_id, now());

  RETURN jsonb_build_object('success', true, 'message', 'OP finalizada e estoque da fábrica atualizado');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.finalizar_op_kanban(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalizar_op_kanban(uuid, numeric) TO anon;

COMMIT;
