BEGIN;

DO $$ 
DECLARE 
    v_org_id uuid := 'ce573296-9b54-4bc9-882e-f88152b670e8'; -- ID da Larissa Saba (ajuste conforme necessário)
BEGIN
    -- 1. LIMPEZA DE MOVIMENTAÇÕES (TRUNCATE para resetar IDs para 1)
    -- Tabelas de log e histórico são limpas totalmente
    EXECUTE 'TRUNCATE TABLE public.movimentacao_estoque RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE public.envios_historico RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE public.registro_perdas RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE public.pagamentos RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE public.alertas_fabrica RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE public.alertas_producao RESTART IDENTITY CASCADE';

    -- 2. LIMPEZA DE VENDAS E CAIXAS (Vinculados à Organização)
    DELETE FROM public.itens_venda WHERE venda_id IN (SELECT id FROM public.vendas WHERE organization_id = v_org_id);
    DELETE FROM public.vendas WHERE organization_id = v_org_id;
    DELETE FROM public.caixa_sessao WHERE organization_id = v_org_id;
    DELETE FROM public.pos_fechamentos WHERE organization_id = v_org_id;

    -- 3. LIMPEZA DE PRODUÇÃO
    DELETE FROM public.distribuicao_pedidos WHERE organization_id = v_org_id;
    DELETE FROM public.registro_producao_real WHERE organization_id = v_org_id;
    DELETE FROM public.ordens_producao WHERE organization_id = v_org_id;

    -- 4. ZERAR SALDOS FÍSICOS (Preserva cadastros, zera números)
    UPDATE public.estoque_produtos SET quantidade = 0 WHERE organization_id = v_org_id;
    UPDATE public.insumos SET estoque_atual = 0 WHERE organization_id = v_org_id;

    -- 5. RESET DE SEQUÊNCIA DA OP
    PERFORM setval(pg_get_serial_sequence('public.ordens_producao', 'numero_op'), 1, false);

    RAISE NOTICE 'Limpeza concluída. Sistema zerado e OP resetada para #1.';
END $$;

COMMIT;
