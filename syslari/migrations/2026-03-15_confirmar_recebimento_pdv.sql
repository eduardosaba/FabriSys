-- Função: confirmar_recebimento_pdv
-- Descrição: realiza a transferência atômica do estoque da fábrica para o PDV
--            valida saldo, atualiza distribuicao_pedidos e registra movimentação.
-- Segurança: SECURITY DEFINER para garantir que a função consiga executar upserts mesmo
--            quando chamada por roles limitadas (ajustar conforme política de privilégios).

CREATE OR REPLACE FUNCTION public.confirmar_recebimento_pdv(
  p_distrib_id uuid,
  p_usuario_id uuid
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE

  v_produto_id uuid;
  v_quantidade numeric;
  v_local_pdv_id uuid;
  v_local_fabrica_id uuid;
  v_org_id uuid;
  v_saldo_fabrica numeric;
BEGIN
  -- 1) Coleta dados da distribuição
  SELECT produto_id, quantidade_solicitada, local_destino_id, organization_id
  INTO v_produto_id, v_quantidade, v_local_pdv_id, v_org_id
  FROM distribuicao_pedidos WHERE id = p_distrib_id;

  IF v_produto_id IS NULL OR v_local_pdv_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Distribuição inválida ou incompleta');
  END IF;

  -- 2) Localiza ID da fábrica pela organização (blindagem contra IDs divergentes no front)
  SELECT id INTO v_local_fabrica_id FROM locais
  WHERE organization_id = v_org_id AND tipo = 'fabrica' LIMIT 1;

  IF v_local_fabrica_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Fábrica não encontrada para a organização');
  END IF;

  -- 3) Verifica saldo na fábrica
  SELECT quantidade INTO v_saldo_fabrica FROM estoque_produtos
  WHERE local_id = v_local_fabrica_id AND produto_id = v_produto_id
  FOR UPDATE;

  IF v_saldo_fabrica IS NULL OR v_saldo_fabrica < v_quantidade THEN
    RETURN json_build_object('success', false, 'message', 'Saldo insuficiente na Fábrica', 'available', v_saldo_fabrica);
  END IF;

  -- 4) Operação atômica: debita fábrica e credita PDV
  -- O SELECT ... FOR UPDATE acima já trava a linha correspondente na fábrica
  UPDATE estoque_produtos
  SET quantidade = quantidade - v_quantidade,
      updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE NULL END
  WHERE local_id = v_local_fabrica_id AND produto_id = v_produto_id;

  -- Creditar no PDV (upsert compatível com variações de schema)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='local_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='created_at') THEN
      INSERT INTO public.estoque_produtos (local_id, produto_id, quantidade, organization_id, created_at, updated_at)
      VALUES (v_local_pdv_id, v_produto_id, v_quantidade, v_org_id, NOW(), NOW())
      ON CONFLICT (local_id, produto_id) DO UPDATE
      SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade,
          updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE public.estoque_produtos.updated_at END;
    ELSE
      INSERT INTO public.estoque_produtos (local_id, produto_id, quantidade, organization_id)
      VALUES (v_local_pdv_id, v_produto_id, v_quantidade, v_org_id)
      ON CONFLICT (local_id, produto_id) DO UPDATE
      SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade;
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='created_at') THEN
      INSERT INTO public.estoque_produtos (produto_id, organization_id, quantidade, created_at, updated_at)
      VALUES (v_produto_id, v_org_id, v_quantidade, NOW(), NOW())
      ON CONFLICT (produto_id, organization_id) DO UPDATE
      SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade,
          updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE public.estoque_produtos.updated_at END;
    ELSE
      INSERT INTO public.estoque_produtos (produto_id, organization_id, quantidade)
      VALUES (v_produto_id, v_org_id, v_quantidade)
      ON CONFLICT (produto_id, organization_id) DO UPDATE
      SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade;
    END IF;
  END IF;

  -- 5) Atualiza distribuicao_pedidos
  UPDATE distribuicao_pedidos
  SET status = 'recebido', quantidade_recebida = v_quantidade, updated_at = NOW(), received_at = NOW()
  WHERE id = p_distrib_id;

  -- 6) Registrar movimentação (compatível com schema)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='local_origem_id') THEN
    INSERT INTO movimentacao_estoque (produto_id, quantidade, local_origem_id, local_destino_id, tipo_movimento, observacoes, created_at)
    VALUES (v_produto_id, v_quantidade, v_local_fabrica_id, v_local_pdv_id, 'entrada_pdv', 'Recebimento confirmado via PDV', NOW());
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='origem') THEN
    INSERT INTO movimentacao_estoque (produto_id, quantidade, origem, destino, tipo_movimento, observacoes, created_at)
    VALUES (v_produto_id, v_quantidade, v_local_fabrica_id::text, v_local_pdv_id::text, 'entrada_pdv', 'Recebimento confirmado via PDV', NOW());
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='tipo_movimento') THEN
    INSERT INTO movimentacao_estoque (produto_id, quantidade, tipo_movimento, observacoes, created_at)
    VALUES (v_produto_id, v_quantidade, 'entrada_pdv', 'Recebimento confirmado via PDV', NOW());
  ELSE
    INSERT INTO movimentacao_estoque (produto_id, quantidade, observacoes, created_at)
    VALUES (v_produto_id, v_quantidade, 'Recebimento confirmado via PDV', NOW());
  END IF;

  RETURN json_build_object('success', true, 'message', 'Estoque transferido com sucesso!');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Conceder EXECUTE à role authenticated (ajuste se necessário)
GRANT EXECUTE ON FUNCTION public.confirmar_recebimento_pdv(uuid, uuid) TO authenticated;
