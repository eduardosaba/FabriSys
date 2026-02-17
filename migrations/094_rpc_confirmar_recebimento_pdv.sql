-- 094_rpc_confirmar_recebimento_pdv.sql
-- RPC para confirmar recebimento no PDV e creditar estoque_produtos
BEGIN;

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
BEGIN
  -- Buscar registro de distribuição
  SELECT produto_id, quantidade_solicitada, local_destino_id, status
  INTO v_produto_id, v_quant_solicitada, v_local_destino, v_status
  FROM public.distribuicao_pedidos
  WHERE id = p_distribuicao_id
  FOR UPDATE;

  IF v_produto_id IS NULL THEN
    RAISE EXCEPTION 'Distribuição não encontrada: %', p_distribuicao_id;
  END IF;

  IF v_status = 'recebido' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Já recebido');
  END IF;

  -- Quantidade efetiva a creditar
  IF p_quantidade IS NULL THEN
    p_quantidade := v_quant_solicitada;
  END IF;

  -- Creditar em estoque_produtos (upsert)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque_produtos') THEN
    IF EXISTS (SELECT 1 FROM public.estoque_produtos WHERE produto_id = v_produto_id AND local_id = v_local_destino) THEN
      UPDATE public.estoque_produtos
      SET quantidade = quantidade + p_quantidade,
          updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE NULL END
      WHERE produto_id = v_produto_id AND local_id = v_local_destino;
    ELSE
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='created_at') THEN
        INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade, created_at)
        VALUES (v_produto_id, v_local_destino, p_quantidade, NOW());
      ELSE
        INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade)
        VALUES (v_produto_id, v_local_destino, p_quantidade);
      END IF;
    END IF;
  END IF;

  -- Atualizar status na distribuição (marcar como recebido) e registrar quantidade_recebida/observacao se colunas existirem
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='quantidade_recebida') THEN
    UPDATE public.distribuicao_pedidos
    SET status = 'recebido',
        quantidade_recebida = COALESCE(p_quantidade, quantidade_recebida),
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

  RETURN jsonb_build_object('success', true, 'produto_id', v_produto_id, 'quantidade', p_quantidade, 'distribuicao_id', p_distribuicao_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder execução para roles padrões da API
GRANT EXECUTE ON FUNCTION public.confirmar_recebimento_pdv(uuid, numeric) TO anon;
GRANT EXECUTE ON FUNCTION public.confirmar_recebimento_pdv(uuid, numeric) TO authenticated;

COMMIT;

-- Nota: esta RPC atualiza `estoque_produtos` e marca a distribuição como recebida.
-- Caso seja necessário, podemos estender para registrar movimentações (movimentacao_estoque) ou validar permissões adicionais.
