-- 098_finalizar_producao_intermediaria.sql
-- RPC idempotente para finalizar produção intermediária (semi-acabado)
-- Cria movimentação de entrada no estoque da fábrica e atualiza a OP como concluída.

BEGIN;

-- Se existir uma função com a mesma assinatura e retorno diferente, é preciso removê-la antes
DROP FUNCTION IF EXISTS public.finalizar_producao_intermediaria(uuid, numeric);

CREATE OR REPLACE FUNCTION public.finalizar_producao_intermediaria(
  p_op_id uuid,
  p_quantidade numeric
) RETURNS jsonb AS $$
DECLARE
  v_produto uuid;
  v_org uuid;
  v_fab uuid;
  v_exists boolean;
  v_mov_id uuid := gen_random_uuid();
BEGIN
  SELECT produto_final_id, organization_id INTO v_produto, v_org
  FROM public.ordens_producao WHERE id = p_op_id;

  IF v_produto IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'OP não encontrada ou sem produto_final_id');
  END IF;

  -- Evita processamento duplo: se já houve uma movimentação de entrada para esta OP
  SELECT EXISTS(SELECT 1 FROM public.movimentacao_estoque WHERE referencia_id = p_op_id AND tipo_movimento = 'entrada') INTO v_exists;
  IF v_exists THEN
    RETURN jsonb_build_object('success', true, 'message', 'Já finalizado (movimentação existente).');
  END IF;

  -- localizar a fábrica (local do tipo 'fabrica') para esta organização
  SELECT id INTO v_fab FROM public.locais WHERE organization_id = v_org AND tipo = 'fabrica' LIMIT 1;
  IF v_fab IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Fábrica não encontrada para a organização.');
  END IF;

  -- atualizar ou inserir estoque_produtos
  IF EXISTS (SELECT 1 FROM public.estoque_produtos WHERE produto_id = v_produto AND local_id = v_fab) THEN
    UPDATE public.estoque_produtos SET quantidade = quantidade + p_quantidade WHERE produto_id = v_produto AND local_id = v_fab;
  ELSE
    INSERT INTO public.estoque_produtos (id, produto_id, local_id, quantidade) VALUES (gen_random_uuid(), v_produto, v_fab, p_quantidade);
  END IF;

  -- registrar movimentação no ledger
  INSERT INTO public.movimentacao_estoque (id, produto_id, quantidade, tipo_movimento, origem, destino, referencia_id, created_at)
  VALUES (v_mov_id, v_produto, p_quantidade, 'entrada', 'producao', v_fab::text, p_op_id, now());

  -- marcar OP como concluída / finalizada
  UPDATE public.ordens_producao
  SET estagio_atual = 'concluido',
      status = 'finalizada',
      quantidade_produzida = COALESCE(quantidade_produzida, p_quantidade)
  WHERE id = p_op_id;

  RETURN jsonb_build_object('success', true, 'message', 'Produção intermediária finalizada e estoque atualizado.');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- conceder execução ao role padrão (ajuste conforme política do seu projeto)
GRANT EXECUTE ON FUNCTION public.finalizar_producao_intermediaria(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalizar_producao_intermediaria(uuid, numeric) TO anon;

COMMIT;
