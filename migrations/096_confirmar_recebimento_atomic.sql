-- 096_confirmar_recebimento_atomic.sql
-- Remove trigger de registro automático e substitui a RPC
-- confirmar_recebimento_pdv por uma versão atômica que também
-- insere no ledger `movimentacao_estoque`.

BEGIN;

-- 1) Remover trigger e função auxiliar (se existirem)
DROP TRIGGER IF EXISTS trg_registrar_movimentacao_apos_recebimento ON public.distribuicao_pedidos;
DROP FUNCTION IF EXISTS public.trg_registrar_movimentacao_apos_recebimento();

-- 2) Criar/atualizar a RPC atômica para confirmar recebimento e registrar movimentação
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
  v_org_id uuid;
  v_quant numeric;
BEGIN
  -- Lock na linha da distribuição
  SELECT produto_id, quantidade_solicitada, local_destino_id, status, (CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='organization_id') THEN organization_id ELSE NULL END)
  INTO v_produto_id, v_quant_solicitada, v_local_destino, v_status, v_org_id
  FROM public.distribuicao_pedidos
  WHERE id = p_distribuicao_id
  FOR UPDATE;

  IF v_produto_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Distribuição não encontrada');
  END IF;

  IF v_status = 'recebido' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Já recebido');
  END IF;

  -- Determina quantidade a creditar
  IF p_quantidade IS NULL THEN
    v_quant := v_quant_solicitada;
  ELSE
    v_quant := p_quantidade;
  END IF;

  -- Atualiza documento da distribuição
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='quantidade_recebida') THEN
    UPDATE public.distribuicao_pedidos
    SET status = 'recebido', quantidade_recebida = v_quant,
        observacao = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='observacao') THEN COALESCE(p_observacao, observacao) ELSE NULL END,
        received_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='received_at') THEN NOW() ELSE NULL END,
        updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='updated_at') THEN NOW() ELSE NULL END
    WHERE id = p_distribuicao_id;
  ELSE
    UPDATE public.distribuicao_pedidos
    SET status = 'recebido'
    WHERE id = p_distribuicao_id;
  END IF;

  -- Upsert em estoque_produtos (se existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='estoque_produtos') THEN
    -- Try upsert using standard SQL compatible with Postgres
    EXECUTE format($f$
      INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade%s)
      VALUES ($1,$2,$3%s)
      ON CONFLICT (produto_id, local_id) DO UPDATE SET quantidade = estoque_produtos.quantidade + EXCLUDED.quantidade
    $f$
    , CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='organization_id') THEN ', organization_id' ELSE '' END
      , CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='organization_id') THEN ', $4' ELSE '' END
    ) USING v_produto_id, v_local_destino, v_quant, v_org_id;
  END IF;

  -- Registrar no ledger movimentacao_estoque se existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='movimentacao_estoque') THEN
    INSERT INTO public.movimentacao_estoque (
      produto_id,
      quantidade,
      tipo_movimento,
      origem,
      destino,
      observacao,
      referencia_id,
      created_at
    ) VALUES (
      v_produto_id,
      v_quant,
      'entrada',
      NULL,
      v_local_destino,
      COALESCE(p_observacao, 'Recebimento confirmado via PDV'),
      p_distribuicao_id,
      NOW()
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'produto_id', v_produto_id, 'quantidade', v_quant, 'distribuicao_id', p_distribuicao_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder execução para roles padrões da API
GRANT EXECUTE ON FUNCTION public.confirmar_recebimento_pdv(uuid, numeric, text) TO anon;
GRANT EXECUTE ON FUNCTION public.confirmar_recebimento_pdv(uuid, numeric, text) TO authenticated;

COMMIT;

-- Observação: revise permissões e teste no ambiente de staging antes de aplicar em produção.
