-- scripts/ajuste_entrada_duplicada.sql
-- Função para criar um ajuste corretivo (movimentação negativa) quando uma entrada foi lançada em excesso.
-- Uso: SELECT public.ajustar_entrada_duplicada('distribuicao-uuid', 100, 'Erro de Lançamento / Entrada Duplicada');

BEGIN;

CREATE OR REPLACE FUNCTION public.ajustar_entrada_duplicada(
  p_distribuicao_id uuid,
  p_ajuste numeric,
  p_motivo text DEFAULT 'Erro de Lançamento / Entrada Duplicada'
) RETURNS jsonb AS $$
DECLARE
  v_produto_id uuid;
  v_local_destino uuid;
  v_exists_est numeric;
BEGIN
  IF p_ajuste IS NULL OR p_ajuste <= 0 THEN
    RAISE EXCEPTION 'p_ajuste deve ser um valor positivo';
  END IF;

  SELECT produto_id, local_destino_id
  INTO v_produto_id, v_local_destino
  FROM public.distribuicao_pedidos
  WHERE id = p_distribuicao_id
  FOR UPDATE;

  IF v_produto_id IS NULL THEN
    RAISE EXCEPTION 'Distribuição não encontrada: %', p_distribuicao_id;
  END IF;

  -- Inserir registro canônico em movimentacao_estoque (registro de ajuste negativo)
  INSERT INTO public.movimentacao_estoque(
    tipo_movimento, quantidade, produto_id, observacoes, data_movimento
  ) VALUES (
    'ajuste_negativo', p_ajuste, v_produto_id, p_motivo, NOW()
  );

  -- Atualizar estoque_produtos subtraindo o ajuste (se existir registro de estoque)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='estoque_produtos') THEN
    IF EXISTS (SELECT 1 FROM public.estoque_produtos WHERE produto_id = v_produto_id AND local_id = v_local_destino) THEN
      UPDATE public.estoque_produtos
      SET quantidade = quantidade - p_ajuste,
          updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE NULL END
      WHERE produto_id = v_produto_id AND local_id = v_local_destino;
    ELSE
      -- Se não há registro de estoque, criar um registro com quantidade negativa (audit trail)
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='created_at') THEN
        INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade, created_at)
        VALUES (v_produto_id, v_local_destino, -p_ajuste, NOW());
      ELSE
        INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade)
        VALUES (v_produto_id, v_local_destino, -p_ajuste);
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'distribuicao_id', p_distribuicao_id, 'ajuste', p_ajuste);
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Atenção: execute esta função como usuário administrador no Supabase SQL Editor.
