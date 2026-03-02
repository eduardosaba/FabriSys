-- Script combinado: DROP/CREATE da função de finalização, ajuste de constraint,
-- garante coluna updated_at em distribuicao_pedidos e bloco de seed para OPs travadas.
-- ATENÇÃO: execute este arquivo no SQL Editor do Supabase/pgAdmin/psql com privilégios de admin.

BEGIN;

-- 1) Remove versão antiga da função para evitar erro 42P13
DROP FUNCTION IF EXISTS public.finalizar_op_kanban(uuid,numeric);

-- 2) Cria/recria a função que finaliza a OP e garante entrada no estoque da Fábrica
CREATE OR REPLACE FUNCTION public.finalizar_op_kanban(p_op_id uuid, p_quantidade_produzida numeric)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_produto_id uuid;
    v_local_fabrica_id uuid;
    v_org_id uuid;
BEGIN
    -- Buscar dados da OP
    SELECT produto_final_id, organization_id INTO v_produto_id, v_org_id
    FROM ordens_producao WHERE id = p_op_id LIMIT 1;

    -- Buscar a fábrica da organização
    SELECT id INTO v_local_fabrica_id FROM locais
    WHERE organization_id = v_org_id AND tipo = 'fabrica' LIMIT 1;

    IF v_local_fabrica_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Erro: Fábrica não encontrada para esta organização.');
    END IF;

    -- Atualizar estoque da fábrica (entrada)
    INSERT INTO estoque_produtos (local_id, produto_id, quantidade, organization_id)
    VALUES (v_local_fabrica_id, v_produto_id, p_quantidade_produzida, v_org_id)
    ON CONFLICT (local_id, produto_id)
    DO UPDATE SET quantidade = estoque_produtos.quantidade + p_quantidade_produzida, updated_at = now();

    -- Finalizar OP
    UPDATE ordens_producao
    SET status = 'finalizada',
        estagio_atual = 'finalizado',
        quantidade_produzida = p_quantidade_produzida,
        data_fim = now()
    WHERE id = p_op_id;

    RETURN json_build_object('success', true, 'message', 'Estoque abastecido e produção finalizada.');
END;
$function$;

-- 3) Garante coluna updated_at em distribuicao_pedidos (evita erros em updates/upserts)
ALTER TABLE distribuicao_pedidos
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4) Ajusta a constraint status_logistica e define default
ALTER TABLE ordens_producao
DROP CONSTRAINT IF EXISTS ordens_producao_status_logistica_check;

ALTER TABLE ordens_producao
ADD CONSTRAINT ordens_producao_status_logistica_check
CHECK (status_logistica IN (
  'planejado',
  'aguardando_expedicao',
  'em_transito',
  'entregue',
  'cancelado',
  'pendente'
));

ALTER TABLE ordens_producao
ALTER COLUMN status_logistica SET DEFAULT 'planejado';

COMMIT;

-- ======================================================================
-- BLOCO OPCIONAL: Abastecer estoque para uma OP específica (edite v_op_numero)
-- Descomente/execute somente se precisar liberar uma OP já finalizada que esteja travando.
-- ======================================================================
-- DO $$
-- DECLARE
--   v_op_numero text := 'OP-001'; -- coloque o numero da OP aqui
--   v_produto uuid;
--   v_fabrica uuid;
--   v_org uuid;
-- BEGIN
--   SELECT produto_final_id, organization_id INTO v_produto, v_org FROM ordens_producao WHERE numero_op = v_op_numero LIMIT 1;
--   SELECT id INTO v_fabrica FROM locais WHERE organization_id = v_org AND tipo = 'fabrica' LIMIT 1;
--   IF v_produto IS NOT NULL AND v_fabrica IS NOT NULL THEN
--     INSERT INTO estoque_produtos (local_id, produto_id, quantidade, organization_id)
--     VALUES (v_fabrica, v_produto, 1000, v_org)
--     ON CONFLICT (local_id, produto_id) DO UPDATE SET quantidade = estoque_produtos.quantidade + 1000, updated_at = now();
--     RAISE NOTICE 'Abastecido OP %', v_op_numero;
--   ELSE
--     RAISE EXCEPTION 'OP ou Fábrica não encontrados para %', v_op_numero;
--   END IF;
-- END $$;

-- FIM
