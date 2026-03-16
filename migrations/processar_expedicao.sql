-- SQL: processar_saida_expedicao and processar_retorno_sobra
-- Use with caution: review types (uuid/numeric) to match your schema.

-- Decrementa estoque da fábrica e incrementa no PDV (atômico)
CREATE OR REPLACE FUNCTION processar_saida_expedicao(
  p_produto_id uuid,
  p_quantidade numeric,
  p_fabrica_id uuid,
  p_pdv_id uuid,
  p_org_id uuid
) RETURNS json LANGUAGE plpgsql AS $$
DECLARE
  v_quantidade numeric;
BEGIN
  -- trava a linha do estoque da fábrica para evitar race conditions
  SELECT quantidade INTO v_quantidade
  FROM estoque_produtos
  WHERE local_id = p_fabrica_id AND produto_id = p_produto_id
  FOR UPDATE;

  IF v_quantidade IS NULL OR v_quantidade < p_quantidade THEN
    RETURN json_build_object('success', false, 'message', 'Saldo insuficiente na fábrica', 'available', v_quantidade);
  END IF;

  UPDATE estoque_produtos
  SET quantidade = quantidade - p_quantidade,
      updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE NULL END
  WHERE local_id = p_fabrica_id AND produto_id = p_produto_id;

  -- Creditar no PDV (upsert compatível com variações de schema)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='local_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='created_at') THEN
      INSERT INTO public.estoque_produtos (local_id, produto_id, quantidade, organization_id, created_at, updated_at)
      VALUES (p_pdv_id, p_produto_id, p_quantidade, p_org_id, NOW(), NOW())
      ON CONFLICT (local_id, produto_id) DO UPDATE
      SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade,
          updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE public.estoque_produtos.updated_at END;
    ELSE
      INSERT INTO public.estoque_produtos (local_id, produto_id, quantidade, organization_id)
      VALUES (p_pdv_id, p_produto_id, p_quantidade, p_org_id)
      ON CONFLICT (local_id, produto_id) DO UPDATE
      SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade;
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='created_at') THEN
      INSERT INTO public.estoque_produtos (produto_id, organization_id, quantidade, created_at, updated_at)
      VALUES (p_produto_id, p_org_id, p_quantidade, NOW(), NOW())
      ON CONFLICT (produto_id, organization_id) DO UPDATE
      SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade,
          updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE public.estoque_produtos.updated_at END;
    ELSE
      INSERT INTO public.estoque_produtos (produto_id, organization_id, quantidade)
      VALUES (p_produto_id, p_org_id, p_quantidade)
      ON CONFLICT (produto_id, organization_id) DO UPDATE
      SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade;
    END IF;
  END IF;

  -- Registrar movimentação (compatível com schema esperado)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='local_origem_id') THEN
    INSERT INTO movimentacao_estoque (produto_id, quantidade, local_origem_id, local_destino_id, tipo_movimento, observacoes, created_at)
    VALUES (p_produto_id, p_quantidade, p_fabrica_id, p_pdv_id, 'saida_expedicao', NULL, NOW());
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='origem') THEN
    INSERT INTO movimentacao_estoque (produto_id, quantidade, origem, destino, tipo_movimento, observacoes, created_at)
    VALUES (p_produto_id, p_quantidade, p_fabrica_id::text, p_pdv_id::text, 'saida_expedicao', NULL, NOW());
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='tipo_movimento') THEN
    INSERT INTO movimentacao_estoque (produto_id, quantidade, tipo_movimento, observacoes, created_at)
    VALUES (p_produto_id, p_quantidade, 'saida_expedicao', NULL, NOW());
  ELSE
    INSERT INTO movimentacao_estoque (produto_id, quantidade, observacoes, created_at)
    VALUES (p_produto_id, p_quantidade, NULL, NOW());
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Decrementa estoque do PDV e incrementa a fábrica (retorno/sobra)
CREATE OR REPLACE FUNCTION processar_retorno_sobra(
  p_produto_id uuid,
  p_quantidade numeric,
  p_pdv_id uuid,
  p_fabrica_id uuid,
  p_org_id uuid
) RETURNS json LANGUAGE plpgsql AS $$
DECLARE
  v_quantidade numeric;
BEGIN
  SELECT quantidade INTO v_quantidade
  FROM estoque_produtos
  WHERE local_id = p_pdv_id AND produto_id = p_produto_id
  FOR UPDATE;

  IF v_quantidade IS NULL OR v_quantidade < p_quantidade THEN
    RETURN json_build_object('success', false, 'message', 'Saldo insuficiente no PDV', 'available', v_quantidade);
  END IF;

  UPDATE estoque_produtos
  SET quantidade = quantidade - p_quantidade,
      updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE NULL END
  WHERE local_id = p_pdv_id AND produto_id = p_produto_id;

  -- Creditar de volta na Fábrica (upsert compatível)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='local_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='created_at') THEN
      INSERT INTO public.estoque_produtos (local_id, produto_id, quantidade, organization_id, created_at, updated_at)
      VALUES (p_fabrica_id, p_produto_id, p_quantidade, p_org_id, NOW(), NOW())
      ON CONFLICT (local_id, produto_id) DO UPDATE
      SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade,
          updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE public.estoque_produtos.updated_at END;
    ELSE
      INSERT INTO public.estoque_produtos (local_id, produto_id, quantidade, organization_id)
      VALUES (p_fabrica_id, p_produto_id, p_quantidade, p_org_id)
      ON CONFLICT (local_id, produto_id) DO UPDATE
      SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade;
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='created_at') THEN
      INSERT INTO public.estoque_produtos (produto_id, organization_id, quantidade, created_at, updated_at)
      VALUES (p_produto_id, p_org_id, p_quantidade, NOW(), NOW())
      ON CONFLICT (produto_id, organization_id) DO UPDATE
      SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade,
          updated_at = CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estoque_produtos' AND column_name='updated_at') THEN NOW() ELSE public.estoque_produtos.updated_at END;
    ELSE
      INSERT INTO public.estoque_produtos (produto_id, organization_id, quantidade)
      VALUES (p_produto_id, p_org_id, p_quantidade)
      ON CONFLICT (produto_id, organization_id) DO UPDATE
      SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade;
    END IF;
  END IF;

  -- Registrar movimentação (compatível com schema)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='local_origem_id') THEN
    INSERT INTO movimentacao_estoque (produto_id, quantidade, local_origem_id, local_destino_id, tipo_movimento, observacoes, created_at)
    VALUES (p_produto_id, p_quantidade, p_pdv_id, p_fabrica_id, 'retorno_sobra', NULL, NOW());
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='origem') THEN
    INSERT INTO movimentacao_estoque (produto_id, quantidade, origem, destino, tipo_movimento, observacoes, created_at)
    VALUES (p_produto_id, p_quantidade, p_pdv_id::text, p_fabrica_id::text, 'retorno_sobra', NULL, NOW());
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='tipo_movimento') THEN
    INSERT INTO movimentacao_estoque (produto_id, quantidade, tipo_movimento, observacoes, created_at)
    VALUES (p_produto_id, p_quantidade, 'retorno_sobra', NULL, NOW());
  ELSE
    INSERT INTO movimentacao_estoque (produto_id, quantidade, observacoes, created_at)
    VALUES (p_produto_id, p_quantidade, NULL, NOW());
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Recomendações:
-- 1) Revise tipos de campo (uuid vs text vs integer) e ajuste as assinaturas.
-- 2) Teste em ambiente de desenvolvimento antes de aplicar em produção.
