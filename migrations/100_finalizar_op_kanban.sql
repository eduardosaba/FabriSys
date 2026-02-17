-- 100_finalizar_op_kanban.sql
-- RPC idempotente para finalizar OP no Kanban e creditar estoque da Fábrica (Doca de Saída)

BEGIN;

DROP FUNCTION IF EXISTS public.finalizar_op_kanban(uuid, numeric);

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
  -- 1. Capturar dados da OP e do produto (assume campo 'tipo' em produtos_finais)
  SELECT op.produto_final_id, pf.tipo, op.organization_id
  INTO v_produto_id, v_tipo_produto, v_org_id
  FROM public.ordens_producao op
  JOIN public.produtos_finais pf ON op.produto_final_id = pf.id
  WHERE op.id = p_op_id;

  IF v_produto_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'OP não encontrada ou produto não configurado');
  END IF;

  -- localizar a fábrica/produção para esta organização
  SELECT id INTO v_local_fabrica_id
  FROM public.locais
  WHERE organization_id = v_org_id AND (tipo = 'producao' OR tipo = 'fabrica')
  LIMIT 1;

  IF v_local_fabrica_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Local de fábrica/produção não encontrado para a organização');
  END IF;

  -- evitar dupla execução: checar movimentação de produção já existente para esta OP
  SELECT EXISTS(SELECT 1 FROM public.movimentacao_estoque WHERE referencia_id = p_op_id AND tipo_movimento = 'entrada_producao') INTO v_exists;
  IF v_exists THEN
    RETURN jsonb_build_object('success', true, 'message', 'OP já processada (movimentação existente)');
  END IF;

  -- atualizar OP
  UPDATE public.ordens_producao
  SET status = 'finalizada', estagio_atual = 'concluido', quantidade_produzida = COALESCE(quantidade_produzida, p_quantidade_produzida)
  WHERE id = p_op_id;

  -- tratar semi-acabado: creditar em tabela de insumos se existir
  IF v_tipo_produto = 'semi_acabado' THEN
    -- tentativa genérica: atualizar insumos por produto (se existir)
    IF EXISTS (SELECT 1 FROM public.insumos WHERE id = v_produto_id) THEN
      UPDATE public.insumos SET estoque_atual = estoque_atual + p_quantidade_produzida WHERE id = v_produto_id;
    END IF;
    -- registrar movimentação (entrada de produção)
    INSERT INTO public.movimentacao_estoque (id, produto_id, quantidade, tipo_movimento, origem, destino, referencia_id, created_at)
    VALUES (v_mov_id, v_produto_id, p_quantidade_produzida, 'entrada_producao', 'producao', v_local_fabrica_id::text, p_op_id, now());

    RETURN jsonb_build_object('success', true, 'message', 'Produção semi-acabada finalizada e estoque de insumos atualizado');
  END IF;

  -- produto acabado: creditar estoque_produtos no local da fábrica
  -- Compatibilidade: se tabela estoque_produtos tiver coluna local_id, use por local.
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='local_id') THEN
    IF EXISTS (SELECT 1 FROM public.estoque_produtos WHERE produto_id = v_produto_id AND local_id = v_local_fabrica_id) THEN
      UPDATE public.estoque_produtos SET quantidade = quantidade + p_quantidade_produzida WHERE produto_id = v_produto_id AND local_id = v_local_fabrica_id;
    ELSE
      INSERT INTO public.estoque_produtos (id, produto_id, local_id, quantidade)
      VALUES (gen_random_uuid(), v_produto_id, v_local_fabrica_id, p_quantidade_produzida);
    END IF;
  ELSE
    -- Fallback: esquema antigo baseado em organization_id
    IF EXISTS (SELECT 1 FROM public.estoque_produtos WHERE produto_id = v_produto_id AND organization_id = v_org_id) THEN
      UPDATE public.estoque_produtos SET quantidade = quantidade + p_quantidade_produzida WHERE produto_id = v_produto_id AND organization_id = v_org_id;
    ELSE
      INSERT INTO public.estoque_produtos (id, produto_id, organization_id, quantidade)
      VALUES (gen_random_uuid(), v_produto_id, v_org_id, p_quantidade_produzida);
    END IF;
  END IF;

  -- registrar movimentação no ledger
  INSERT INTO public.movimentacao_estoque (id, produto_id, quantidade, tipo_movimento, origem, destino, referencia_id, created_at)
  VALUES (v_mov_id, v_produto_id, p_quantidade_produzida, 'entrada_producao', 'producao', v_local_fabrica_id::text, p_op_id, now());

  RETURN jsonb_build_object('success', true, 'message', 'OP finalizada e estoque da fábrica atualizado');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- permissões
GRANT EXECUTE ON FUNCTION public.finalizar_op_kanban(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalizar_op_kanban(uuid, numeric) TO anon;

COMMIT;
