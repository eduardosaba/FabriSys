-- Abastece a fábrica automaticamente buscando os IDs pelo nome
DO $$ 
DECLARE 
    v_local_id uuid;
    v_produto_id uuid;
    v_org_id uuid;
BEGIN
    -- 1. Busca o ID da Fábrica
    SELECT id, organization_id INTO v_local_id, v_org_id 
    FROM locais 
    WHERE tipo = 'fabrica' 
    LIMIT 1;

    -- 2. Busca o ID do Produto (MUDE O NOME ABAIXO)
    SELECT id INTO v_produto_id 
    FROM produtos_finais 
    WHERE nome ILIKE '%Brigadeiro%' -- 🎯 Troque 'Brigadeiro' pelo nome do seu produto
    LIMIT 1;

    -- 3. Insere ou aumenta o estoque em 1000 unidades
    IF v_local_id IS NOT NULL AND v_produto_id IS NOT NULL THEN
        INSERT INTO estoque_produtos (local_id, produto_id, quantidade, organization_id)
        VALUES (v_local_id, v_produto_id, 1000, v_org_id)
        ON CONFLICT (local_id, produto_id) 
        DO UPDATE SET quantidade = estoque_produtos.quantidade + 1000;
    END IF;
END $$;

-- OBS: Substitua 'Brigadeiro' pela parte do nome do produto que você tem cadastrado.
-- Execute este script no SQL Editor do banco (psql, pgAdmin, Supabase SQL).
