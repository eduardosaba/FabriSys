-- 080_create_rpc_movimentar_ordem.sql
-- Cria a função RPC `movimentar_ordem` usada pelo Kanban para mover ordens entre estágios
BEGIN;

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
  -- Bloqueia a ordem para evitar concorrência
  SELECT * INTO v_ord FROM public.ordens_producao WHERE id = p_ordem_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ordem não encontrada');
  END IF;

  v_produto_id := v_ord.produto_final_id;
  IF v_produto_id IS NOT NULL THEN
    SELECT tipo INTO v_tipo_prod FROM public.produtos_finais WHERE id = v_produto_id;
  END IF;

  -- Se for um produto semi-acabado, registrar como lote de insumo e finalizar a OP diretamente
  IF v_tipo_prod IS NOT NULL AND v_tipo_prod = 'semi_acabado' AND p_novo_estagio IN ('concluido','finalizado') THEN
    -- Determina quantidade produzida (fallback para quantidade_prevista)
    v_q := COALESCE(v_ord.quantidade_produzida, v_ord.quantidade_prevista, 0);

    -- Garantir insumo virtual existe para esse produto
    SELECT id INTO v_insumo_id FROM public.insumos WHERE produto_final_id = v_produto_id AND tipo_insumo = 'virtual' LIMIT 1;
    IF NOT FOUND THEN
      INSERT INTO public.insumos (nome, unidade_medida, unidade_estoque, unidade_consumo, fator_conversao, estoque_minimo_alerta, produto_final_id, tipo_insumo, created_at)
      VALUES (
        (SELECT nome || ' (Semi-Acabado)' FROM public.produtos_finais WHERE id = v_produto_id),
        'kg', 'KG', 'kg', 1, 0, v_produto_id, 'virtual', NOW()
      ) RETURNING id INTO v_insumo_id;
    END IF;

    -- Inserir lote com a quantidade produzida
    IF v_insumo_id IS NOT NULL AND v_q > 0 THEN
      INSERT INTO public.lotes_insumos (insumo_id, quantidade_inicial, quantidade_restante, data_recebimento, created_at)
      VALUES (v_insumo_id, v_q, v_q, NOW()::date, NOW());
    END IF;

    -- Finaliza a ordem de produção (não vai para expedição)
    UPDATE public.ordens_producao
    SET status = 'finalizada', data_fim = NOW(), updated_at = NOW(), estagio_atual = p_novo_estagio
    WHERE id = p_ordem_id;

    RETURN jsonb_build_object('success', true, 'message', 'Ordem finalizada e estoque intermediário atualizado');

  END IF;

  -- Caso contrário, comportamento anterior: Atualiza estágio
  UPDATE public.ordens_producao
  SET estagio_atual = p_novo_estagio,
      updated_at = NOW()
  WHERE id = p_ordem_id;

  -- Atualiza status se informado ou aplica regra simples ao mover para estágio final
  IF p_novo_status IS NOT NULL THEN
    UPDATE public.ordens_producao
    SET status = p_novo_status,
        updated_at = NOW(),
        data_fim = CASE WHEN p_novo_status IN ('finalizada','concluido') THEN NOW() ELSE data_fim END
    WHERE id = p_ordem_id;
  ELSE
    IF p_novo_estagio IN ('concluido','finalizado') THEN
      UPDATE public.ordens_producao
      SET status = 'finalizada', data_fim = NOW(), updated_at = NOW()
      WHERE id = p_ordem_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Ordem movida');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Nota: revise owner/permissões após aplicar no Supabase.
