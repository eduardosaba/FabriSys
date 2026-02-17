-- 091_finalizar_producao_intermediaria.sql
-- Função para incrementar estoque de insumo quando uma OP de produto semi-acabado é finalizada
BEGIN;

CREATE OR REPLACE FUNCTION public.finalizar_producao_intermediaria(
  p_op_id UUID,
  p_quantidade NUMERIC
) RETURNS VOID AS $$
DECLARE
  v_produto_id UUID;
  v_insumo_id UUID;
  v_org_id UUID;
  v_nome text;
BEGIN
  -- Buscar produto e organização da OP
  SELECT produto_final_id, organization_id, quantidade_prevista INTO v_produto_id, v_org_id, p_quantidade
  FROM public.ordens_producao WHERE id = p_op_id;

  IF v_produto_id IS NULL THEN
    RAISE NOTICE 'OP sem produto_final_id: %', p_op_id;
    RETURN;
  END IF;

  SELECT nome INTO v_nome FROM public.produtos_finais WHERE id = v_produto_id;

  -- 1) Tentar encontrar insumo já vinculado via produto_final_id
  SELECT id INTO v_insumo_id FROM public.insumos WHERE produto_final_id = v_produto_id LIMIT 1;

  -- 2) Se não existir, tentar buscar por nome (+ organization se disponível)
  IF v_insumo_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insumos' AND column_name='organization_id') AND v_org_id IS NOT NULL THEN
      SELECT id INTO v_insumo_id FROM public.insumos WHERE nome = v_nome AND organization_id = v_org_id LIMIT 1;
    ELSE
      SELECT id INTO v_insumo_id FROM public.insumos WHERE nome = v_nome LIMIT 1;
    END IF;
  END IF;

  -- 3) Se ainda não existir insumo, criar um insumo virtual
  IF v_insumo_id IS NULL THEN
    -- Garantir colunas obrigatórias ao criar insumo virtual
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insumos' AND column_name='organization_id') THEN
      INSERT INTO public.insumos (
        organization_id, nome, unidade_medida, unidade_estoque, unidade_consumo, fator_conversao,
        estoque_minimo_alerta, produto_final_id, tipo_insumo, created_at
      )
      VALUES (
        v_org_id, v_nome, 'kg', 'KG', 'kg', 1,
        0, v_produto_id, 'virtual', NOW()
      ) RETURNING id INTO v_insumo_id;
    ELSE
      INSERT INTO public.insumos (
        nome, unidade_medida, unidade_estoque, unidade_consumo, fator_conversao,
        estoque_minimo_alerta, produto_final_id, tipo_insumo, created_at
      )
      VALUES (
        v_nome, 'kg', 'KG', 'kg', 1,
        0, v_produto_id, 'virtual', NOW()
      ) RETURNING id INTO v_insumo_id;
    END IF;
  END IF;

  -- 4) Inserir lote com a quantidade produzida
  IF v_insumo_id IS NOT NULL AND COALESCE(p_quantidade,0) > 0 THEN
    INSERT INTO public.lotes_insumos (insumo_id, quantidade_inicial, quantidade_restante, data_recebimento, created_at)
    VALUES (v_insumo_id, p_quantidade, p_quantidade, NOW()::date, NOW());
  END IF;

  -- 5) Registrar movimentação se tabela existir (inserir apenas colunas presentes para compatibilidade entre ambientes)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='movimentacao_estoque') THEN
    DECLARE
      v_cols TEXT := '';
      v_vals TEXT := '';
    BEGIN
      -- insumo_id (UUID)
      v_cols := 'insumo_id';
      v_vals := quote_literal(v_insumo_id::text);

      -- tipo_movimento (texto)
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='tipo_movimento') THEN
        v_cols := v_cols || ', tipo_movimento';
        v_vals := v_vals || ', ' || quote_literal('entrada');
      END IF;

      -- quantidade (numérico)
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='quantidade') THEN
        v_cols := v_cols || ', quantidade';
        v_vals := v_vals || ', ' || COALESCE(p_quantidade::text, '0');
      END IF;

      -- origem (texto)
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='origem') THEN
        v_cols := v_cols || ', origem';
        v_vals := v_vals || ', ' || quote_literal('Produção Interna (OP Finalizada)');
      END IF;

      -- organization_id (UUID)
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='organization_id') THEN
        v_cols := v_cols || ', organization_id';
        v_vals := v_vals || ', ' || quote_literal(COALESCE(v_org_id::text, NULL));
      END IF;

      -- created_at (timestamp) preferir NOW() sem aspas
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacao_estoque' AND column_name='created_at') THEN
        v_cols := v_cols || ', created_at';
        v_vals := v_vals || ', NOW()';
      END IF;

      -- Executar inserção dinâmica somente se pelo menos a coluna insumo_id existir
      IF v_cols <> '' THEN
        EXECUTE format('INSERT INTO public.movimentacao_estoque (%s) VALUES (%s)', v_cols, v_vals);
      END IF;
    END;
  END IF;

  -- 6) Atualizar OP: marcar finalizada e registrar quantidade_produzida
  UPDATE public.ordens_producao
  SET status = 'finalizada', quantidade_produzida = COALESCE(p_quantidade, quantidade_produzida), updated_at = NOW(), data_fim = NOW()
  WHERE id = p_op_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Nota: esta função é idempotente quanto à criação de insumo/lotes; revise permissões no Supabase.
