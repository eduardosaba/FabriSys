-- Remove a função antiga se existir e cria a nova versão que retorna JSON
-- 1) Remove função antiga para evitar erro 42P13
DROP FUNCTION IF EXISTS public.finalizar_op_kanban(uuid,numeric);

-- 2) Cria a nova função que finaliza a OP e atualiza o estoque da fábrica
CREATE OR REPLACE FUNCTION public.finalizar_op_kanban(p_op_id uuid, p_quantidade_produzida numeric)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_produto_id uuid;
    v_local_fabrica_id uuid;
    v_org_id uuid;
BEGIN
    -- 1. Buscar dados da OP
    SELECT produto_final_id, organization_id INTO v_produto_id, v_org_id
    FROM ordens_producao WHERE id = p_op_id LIMIT 1;

    -- 2. Buscar a fábrica da organização
    SELECT id INTO v_local_fabrica_id FROM locais 
    WHERE organization_id = v_org_id AND tipo = 'fabrica' LIMIT 1;

    -- 3. Validação de segurança
    IF v_local_fabrica_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Erro: Fábrica não encontrada para esta organização.');
    END IF;

    -- 4. ABASTECER ESTOQUE DA FÁBRICA
    INSERT INTO estoque_produtos (local_id, produto_id, quantidade, organization_id)
    VALUES (v_local_fabrica_id, v_produto_id, p_quantidade_produzida, v_org_id)
    ON CONFLICT (local_id, produto_id) 
    DO UPDATE SET quantidade = estoque_produtos.quantidade + p_quantidade_produzida;

    -- 5. Atualizar status da OP
    UPDATE ordens_producao 
    SET status = 'finalizada', 
        estagio_atual = 'finalizado',
        quantidade_produzida = p_quantidade_produzida,
        data_fim = now()
    WHERE id = p_op_id;

    RETURN json_build_object('success', true, 'message', 'Produção finalizada e estoque disponível na fábrica.');
END;
$function$;

-- Execute este script no SQL Editor do Supabase/pgAdmin/psql.
