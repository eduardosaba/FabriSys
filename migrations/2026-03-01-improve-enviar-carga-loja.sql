-- Migration: improve enviar_carga_loja (atomic updates and clearer errors)
-- Created: 2026-03-01
-- Replaces previous implementation with an atomic update strategy

BEGIN;

DROP FUNCTION IF EXISTS public.enviar_carga_loja(uuid, numeric, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.enviar_carga_loja(
  p_produto_id uuid,
  p_quantidade numeric,
  p_local_origem_id uuid,
  p_local_destino_id uuid,
  p_ordem_producao_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_estoque_atual numeric;
  v_distribuicao_id uuid;
  v_new_quant numeric;
  v_org_id uuid;
BEGIN
  -- Validação básica de parâmetros
  IF p_produto_id IS NULL OR p_quantidade IS NULL OR p_quantidade <= 0 OR p_local_origem_id IS NULL OR p_local_destino_id IS NULL THEN
    RAISE EXCEPTION 'Parâmetros inválidos para enviar_carga_loja';
  END IF;

  -- Verificar existência da tabela de estoque
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='estoque_produtos'
  ) THEN
    RAISE EXCEPTION 'Tabela estoque_produtos não existe. Verifique o schema.';
  END IF;

  -- Se a tabela tem coluna local_id, usamos uma atualização atômica com condição de quantidade >= p_quantidade
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='local_id') THEN
    UPDATE public.estoque_produtos
    SET quantidade = quantidade - p_quantidade,
        updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE updated_at END
    WHERE produto_id = p_produto_id
      AND local_id = p_local_origem_id
      AND quantidade >= p_quantidade
    RETURNING quantidade INTO v_new_quant;

    -- Se nenhum registro foi atualizado, busca o saldo atual para mensagem amigável
    IF NOT FOUND THEN
      SELECT quantidade INTO v_estoque_atual
      FROM public.estoque_produtos
      WHERE produto_id = p_produto_id AND local_id = p_local_origem_id
      LIMIT 1;

      RAISE EXCEPTION 'Estoque insuficiente na origem. Disponível: %', COALESCE(v_estoque_atual, 0);
    END IF;

  ELSE
    -- Fallback por organization_id: calcula org do local_origem e aplica atualização atômica
    SELECT organization_id INTO v_org_id FROM public.locais WHERE id = p_local_origem_id LIMIT 1;
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Local de origem inválido ou sem organization_id';
    END IF;

    UPDATE public.estoque_produtos
    SET quantidade = quantidade - p_quantidade,
        updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE updated_at END
    WHERE produto_id = p_produto_id
      AND organization_id = v_org_id
      AND quantidade >= p_quantidade
    RETURNING quantidade INTO v_new_quant;

    IF NOT FOUND THEN
      SELECT quantidade INTO v_estoque_atual
      FROM public.estoque_produtos
      WHERE produto_id = p_produto_id AND organization_id = v_org_id
      LIMIT 1;

      RAISE EXCEPTION 'Estoque insuficiente na origem (org). Disponível: %', COALESCE(v_estoque_atual, 0);
    END IF;
  END IF;

  -- Criar registro de distribuição (garantir rastreio)
  INSERT INTO public.distribuicao_pedidos (
    produto_id, quantidade_solicitada, local_origem_id, local_destino_id, ordem_producao_id, status, created_at
  ) VALUES (
    p_produto_id, p_quantidade, p_local_origem_id, p_local_destino_id, p_ordem_producao_id, 'enviado', now()
  ) RETURNING id INTO v_distribuicao_id;

  -- Se ligada a OP, tentar marcar status_logistica (silenciosamente se coluna não existir)
  IF p_ordem_producao_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ordens_producao' AND column_name='status_logistica') THEN
      UPDATE public.ordens_producao
      SET status_logistica = 'enviado', updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ordens_producao' AND column_name='updated_at') THEN NOW() ELSE updated_at END
      WHERE id = p_ordem_producao_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_distribuicao_id);

EXCEPTION WHEN OTHERS THEN
  -- Mensagem limpa para o cliente; log detalhado permanece no DB/server
  RAISE EXCEPTION 'Erro na expedição: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.enviar_carga_loja(uuid, numeric, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_carga_loja(uuid, numeric, uuid, uuid, uuid) TO anon;

COMMIT;

-- After applying: run in Supabase Console -> Settings -> Database -> Restart to refresh PostgREST cache.
