-- Migration: criar funções para confirmar ou rejeitar retornos pendentes
-- Execute no Supabase como owner

BEGIN;

CREATE OR REPLACE FUNCTION public.confirmar_retorno_fabrica(p_envio_id uuid, p_recebedor uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v record;
BEGIN
  SELECT * INTO v FROM public.envios_historico WHERE id = p_envio_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Registro de envio não encontrado');
  END IF;

  IF v.status IS DISTINCT FROM 'retorno_pendente' THEN
    RETURN json_build_object('success', false, 'message', 'Envio não está em estado pendente');
  END IF;

  -- Subtrai do PDV
  UPDATE public.estoque_produtos
  SET quantidade = quantidade - v.quantidade, updated_at = now()
  WHERE local_id = v.local_origem_id AND produto_id = v.produto_id;

  -- Adiciona na Fábrica
  INSERT INTO public.estoque_produtos (local_id, produto_id, quantidade, organization_id, updated_at)
  VALUES (v.local_destino_id, v.produto_id, v.quantidade, v.organization_id, now())
  ON CONFLICT (local_id, produto_id)
  DO UPDATE SET quantidade = estoque_produtos.quantidade + EXCLUDED.quantidade, updated_at = now();

  -- Movimentações para auditoria
  INSERT INTO public.movimentacoes_estoque (produto_id, local_id, quantidade, tipo, observacao, organization_id)
  VALUES (v.produto_id, v.local_origem_id, -v.quantidade, 'retorno_confirmado', 'Retorno confirmado pela fábrica', v.organization_id);

  INSERT INTO public.movimentacoes_estoque (produto_id, local_id, quantidade, tipo, observacao, organization_id)
  VALUES (v.produto_id, v.local_destino_id, v.quantidade, 'retorno_confirmado', 'Retorno confirmado pela fábrica', v.organization_id);

  UPDATE public.envios_historico
  SET status = 'retorno_confirmado', recebido_por = p_recebedor, recebido_em = now()
  WHERE id = p_envio_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.rejeitar_retorno_fabrica(p_envio_id uuid, p_recebedor uuid, p_motivo text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v record;
BEGIN
  SELECT * INTO v FROM public.envios_historico WHERE id = p_envio_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Registro de envio não encontrado');
  END IF;

  IF v.status IS DISTINCT FROM 'retorno_pendente' THEN
    RETURN json_build_object('success', false, 'message', 'Envio não está em estado pendente');
  END IF;

  -- Marca como rejeitado e registra perda no PDV (se desejado)
  INSERT INTO public.movimentacoes_estoque (produto_id, local_id, quantidade, tipo, observacao, organization_id)
  VALUES (v.produto_id, v.local_origem_id, -v.quantidade, 'perda_retorno', COALESCE(p_motivo, 'Sobra rejeitada na fábrica'), v.organization_id);

  UPDATE public.envios_historico
  SET status = 'retorno_rejeitado', recebido_por = p_recebedor, recebido_em = now(), observacao = COALESCE(observacao, '') || '\nRejeitado: ' || COALESCE(p_motivo, '')
  WHERE id = p_envio_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Garantir execução por roles necessárias
GRANT EXECUTE ON FUNCTION public.confirmar_retorno_fabrica(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rejeitar_retorno_fabrica(uuid, uuid, text) TO authenticated;

COMMIT;
