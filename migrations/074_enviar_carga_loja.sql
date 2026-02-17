-- 074_enviar_carga_loja.sql
-- Cria a tabela de pedidos de distribuição (se não existir) e a função `enviar_carga_loja`.
-- Execute no Supabase SQL Editor ou via psql.

BEGIN;

-- Garante que qualquer versão anterior da função com assinatura igual seja removida
-- antes de criarmos a nova versão (evita erro 42P13 ao alterar tipo de retorno).
DROP FUNCTION IF EXISTS public.enviar_carga_loja(uuid, numeric, uuid, uuid, uuid);

-- Cria tabela `distribuicao_pedidos` se necessária (registro de cargas enviadas)
CREATE TABLE IF NOT EXISTS public.distribuicao_pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL,
  quantidade_solicitada numeric NOT NULL,
  local_origem_id uuid NOT NULL,
  local_destino_id uuid NOT NULL,
  ordem_producao_id uuid,
  status text NOT NULL DEFAULT 'enviado',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Função para enviar carga de um local para outro (ex: Fábrica -> Loja)
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
BEGIN
  -- Verificar existência da tabela de estoque
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='estoque_produtos'
  ) THEN
    RAISE EXCEPTION 'Tabela estoque_produtos não existe. Verifique o schema.';
  END IF;

  -- 1. Verificar Estoque na Fábrica
  -- 1. Verificar Estoque na Fábrica (compatível com schemas com/sem local_id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='local_id') THEN
    SELECT quantidade INTO v_estoque_atual
    FROM public.estoque_produtos
    WHERE produto_id = p_produto_id AND local_id = p_local_origem_id
    FOR UPDATE;

    IF v_estoque_atual IS NULL OR v_estoque_atual < p_quantidade THEN
      RAISE EXCEPTION 'Estoque insuficiente na origem. Disponível: %', COALESCE(v_estoque_atual, 0);
    END IF;

    -- 2. Baixar Estoque da Fábrica por local
    UPDATE public.estoque_produtos
    SET quantidade = quantidade - p_quantidade
    WHERE produto_id = p_produto_id AND local_id = p_local_origem_id;
  ELSE
    -- Fallback: usar organization_id se local_id não existir
    SELECT quantidade INTO v_estoque_atual
    FROM public.estoque_produtos
    WHERE produto_id = p_produto_id AND organization_id = (SELECT organization_id FROM public.locais WHERE id = p_local_origem_id LIMIT 1)
    FOR UPDATE;

    IF v_estoque_atual IS NULL OR v_estoque_atual < p_quantidade THEN
      RAISE EXCEPTION 'Estoque insuficiente na origem (org). Disponível: %', COALESCE(v_estoque_atual, 0);
    END IF;

    UPDATE public.estoque_produtos
    SET quantidade = quantidade - p_quantidade
    WHERE produto_id = p_produto_id AND organization_id = (SELECT organization_id FROM public.locais WHERE id = p_local_origem_id LIMIT 1);
  END IF;

  -- 3. Criar Registro de Distribuição (Carga em Trânsito)
  INSERT INTO public.distribuicao_pedidos (
    produto_id, quantidade_solicitada, local_origem_id, local_destino_id, ordem_producao_id, status, created_at
  ) VALUES (
    p_produto_id, p_quantidade, p_local_origem_id, p_local_destino_id, p_ordem_producao_id, 'enviado', now()
  ) RETURNING id INTO v_distribuicao_id;

  RETURN jsonb_build_object('success', true, 'id', v_distribuicao_id);

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro na expedição: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Após aplicar, execute no Supabase Console: Settings -> Database -> Restart
-- Para garantir que PostgREST/Realtime atualizem o schema cache.
