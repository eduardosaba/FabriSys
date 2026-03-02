-- Injetar estoque para a OP que está travando o envio
-- Substitua o valor de v_op_numero pela OP que apresentou erro (ex: 'OP-001')
DO $$ 
DECLARE 
    v_op_numero text := 'OP-001'; -- 🎯 COLOQUE O NÚMERO DA OP QUE DEU ERRO AQUI
    v_id_produto uuid;
    v_id_fabrica uuid;
    v_id_org uuid;
BEGIN
    -- Busca os dados da OP (produto e organização)
    SELECT produto_final_id, organization_id INTO v_id_produto, v_id_org
    FROM ordens_producao WHERE numero_op = v_op_numero LIMIT 1;

    -- Busca a Fábrica
    SELECT id INTO v_id_fabrica FROM locais WHERE tipo = 'fabrica' LIMIT 1;

    IF v_id_produto IS NOT NULL AND v_id_fabrica IS NOT NULL THEN
        INSERT INTO estoque_produtos (local_id, produto_id, quantidade, organization_id)
        VALUES (v_id_fabrica, v_id_produto, 1000, v_id_org)
        ON CONFLICT (local_id, produto_id) 
        DO UPDATE SET quantidade = estoque_produtos.quantidade + 1000;
        RAISE NOTICE 'Estoque abastecido para o produto da OP %', v_op_numero;
    ELSE
        RAISE EXCEPTION 'Não foi possível localizar a OP ou a Fábrica.';
    END IF;
END $$;

-- Execute no SQL Editor do Supabase/pgAdmin/psql após ajustar v_op_numero
