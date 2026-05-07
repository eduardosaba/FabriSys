-- 20260424_fix_confirmar_recebimento_pdv.sql
-- Ajusta a RPC confirmar_recebimento_pdv para NÃO creditar estoque
-- quando o estoque já foi pré-movimentado no envio (evita duplicidade)
BEGIN;

-- Substitui a função existente por versão que não altera `estoque_produtos`.
DROP FUNCTION IF EXISTS public.confirmar_recebimento_pdv(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.confirmar_recebimento_pdv(uuid, numeric);

CREATE OR REPLACE FUNCTION public.confirmar_recebimento_pdv(
  p_distribuicao_id uuid,
  p_quantidade numeric DEFAULT NULL,
  p_observacao text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_produto_id uuid;
  v_quant_solicitada numeric;
  v_local_destino uuid;
  v_quant_recebida numeric;
  v_status text;
BEGIN
  -- Buscar registro de distribuição (inclui quantidade_recebida se existir)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='quantidade_recebida') THEN
    SELECT produto_id, quantidade_solicitada, local_destino_id, status, quantidade_recebida
    INTO v_produto_id, v_quant_solicitada, v_local_destino, v_status, v_quant_recebida
    FROM public.distribuicao_pedidos
    WHERE id = p_distribuicao_id
    FOR UPDATE;
  ELSE
    SELECT produto_id, quantidade_solicitada, local_destino_id, status
    INTO v_produto_id, v_quant_solicitada, v_local_destino, v_status
    FROM public.distribuicao_pedidos
    WHERE id = p_distribuicao_id
    FOR UPDATE;
  END IF;

  IF v_produto_id IS NULL THEN
    RAISE EXCEPTION 'Distribuição não encontrada: %', p_distribuicao_id;
  END IF;

  IF v_status = 'recebido' OR v_status = 'entregue' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Já recebido');
  END IF;

  -- Se já houver uma quantidade registrada na distribuição, tratar como idempotente
  IF v_quant_recebida IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Já recebeu: quantidade registrada anteriormente', 'quantidade_recebida', v_quant_recebida);
  END IF;

  -- Quantidade efetiva a confirmar
  IF p_quantidade IS NULL THEN
    p_quantidade := v_quant_solicitada;
  END IF;

  -- Validação de divergência crítica
  IF v_quant_solicitada IS NOT NULL AND p_quantidade > v_quant_solicitada * 1.1 THEN
    RAISE EXCEPTION 'Quantidade informada (%) é muito superior à enviada (%). Verifique se não está somando com o estoque antigo!', p_quantidade, v_quant_solicitada;
  END IF;

  -- NOTA: NÃO creditar em `estoque_produtos` aqui, pois o estoque já deve ter sido pré-movimentado
  -- durante o envio (função enviar_carga_loja ou processo de integração). Isto evita duplicar a entrada
  -- quando o envio já inseriu/atualizou o saldo. Se a sua arquitetura exigir o crédito aqui, remova
  -- este comentário e restaure a lógica anterior.

  -- Atualizar status na distribuição (marcar como recebido/entregue) e registrar quantidade_recebida/observacao se colunas existirem
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

-- Compatibilidade: overload com 2 parâmetros
CREATE OR REPLACE FUNCTION public.confirmar_recebimento_pdv(
  p_distribuicao_id uuid,
  p_quantidade numeric
) RETURNS jsonb AS $$
BEGIN
  RETURN public.confirmar_recebimento_pdv(p_distribuicao_id, p_quantidade, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.confirmar_recebimento_pdv(uuid, numeric, text) TO anon;
GRANT EXECUTE ON FUNCTION public.confirmar_recebimento_pdv(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_recebimento_pdv(uuid, numeric) TO anon;
GRANT EXECUTE ON FUNCTION public.confirmar_recebimento_pdv(uuid, numeric) TO authenticated;

COMMIT;

-- Observação: após aplicar esta migration, o fluxo deve garantir que o envio pré-mova o estoque
-- (função `enviar_carga_loja`). Se preferir manter a lógica de creditar aqui, podemos em vez
-- disso adicionar uma checagem para registrar uma `movimentacao_estoque` e tornar a RPC idempotente.
