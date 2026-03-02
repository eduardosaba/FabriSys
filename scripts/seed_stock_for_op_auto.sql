-- Script robusto para injetar estoque automaticamente para uma OP
-- Como usar:
-- 1) Se souber o número da OP, troque v_op_numero por esse valor.
-- 2) Se deixar v_op_numero vazio, o script tentará a OP 'finalizada' mais recente.
-- 3) Execute no editor SQL do Supabase/pgAdmin/psql.

DO $$
DECLARE
  v_op_numero text := ''; -- Coloque aqui o número da OP (ex: 'OP-001') ou deixe vazio
  v_op_id uuid;
  v_numero_op text;
  v_produto_id uuid;
  v_org_id uuid;
  v_fabrica_id uuid;
BEGIN
  IF v_op_numero IS NULL OR btrim(v_op_numero) = '' THEN
    -- Pegar a OP finalizada mais recente
    SELECT id, numero_op, produto_final_id, organization_id
    INTO v_op_id, v_numero_op, v_produto_id, v_org_id
    FROM ordens_producao
    WHERE status = 'finalizada'
    ORDER BY data_fim DESC NULLS LAST, created_at DESC
    LIMIT 1;
  ELSE
    SELECT id, numero_op, produto_final_id, organization_id
    INTO v_op_id, v_numero_op, v_produto_id, v_org_id
    FROM ordens_producao
    WHERE numero_op = v_op_numero
    LIMIT 1;
  END IF;

  IF v_op_id IS NULL THEN
    RAISE EXCEPTION 'OP não encontrada (numero_op=%). Verifique o número informado.', v_op_numero;
  END IF;

  -- Tenta localizar a fábrica da organização primeiro
  SELECT id INTO v_fabrica_id FROM locais WHERE organization_id = v_org_id AND tipo = 'fabrica' LIMIT 1;

  -- Se não encontrou por organização, tenta qualquer fábrica disponível
  IF v_fabrica_id IS NULL THEN
    SELECT id INTO v_fabrica_id FROM locais WHERE tipo = 'fabrica' LIMIT 1;
  END IF;

  IF v_fabrica_id IS NULL THEN
    RAISE EXCEPTION 'Fábrica não encontrada para a OP % (org=%).', v_numero_op, v_org_id;
  END IF;

  IF v_produto_id IS NULL THEN
    RAISE EXCEPTION 'Produto não informado na OP % (produto_final_id IS NULL).', v_numero_op;
  END IF;

  -- Insere ou aumenta o estoque em 1000 unidades
  INSERT INTO estoque_produtos (local_id, produto_id, quantidade, organization_id)
  VALUES (v_fabrica_id, v_produto_id, 1000, v_org_id)
  ON CONFLICT (local_id, produto_id)
  DO UPDATE SET quantidade = estoque_produtos.quantidade + 1000;

  RAISE NOTICE 'Estoque abastecido para OP % (produto=%) na fabrica %', v_numero_op, v_produto_id, v_fabrica_id;
END $$;

-- Observações:
-- - Evite executar consultas com placeholders literais como 'ORG_ID' ou 'PROD_ID' (causam 22P02).
-- - Use as queries de diagnóstico anteriores para inspecionar valores reais antes de rodar se necessário.
