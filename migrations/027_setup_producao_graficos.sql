CREATE OR REPLACE FUNCTION public.obter_dados_producao_diaria(periodo_ref text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    data_inicio timestamp;
    data_fim timestamp;
    resultado json;
BEGIN
    -- Define o período de análise
    CASE periodo_ref
        WHEN 'dia' THEN
            data_inicio := current_date - interval '24 hours';
            data_fim := current_date;
        WHEN 'semana' THEN
            data_inicio := date_trunc('week', current_date);
            data_fim := data_inicio + interval '1 week';
        ELSE -- mês
            data_inicio := date_trunc('month', current_date);
            data_fim := data_inicio + interval '1 month';
    END CASE;

    WITH producao_diaria AS (
        SELECT
            DATE_TRUNC('day', op.data_inicio)::date as data,
            SUM(op.quantidade_prevista) as quantidade_prevista,
            COALESCE(SUM(rp.quantidade_produzida), 0) as quantidade_produzida
        FROM ordens_producao op
        LEFT JOIN registro_producao_real rp ON rp.ordem_producao_id = op.id
        WHERE op.data_inicio >= data_inicio AND op.data_inicio < data_fim
        GROUP BY DATE_TRUNC('day', op.data_inicio)::date
        ORDER BY data
    )
    SELECT json_agg(
        json_build_object(
            'data', data,
            'quantidade_prevista', quantidade_prevista,
            'quantidade_produzida', quantidade_produzida,
            'eficiencia', CASE 
                WHEN quantidade_prevista > 0 
                THEN ROUND(100.0 * quantidade_produzida / quantidade_prevista, 1)
                ELSE 0 
            END
        )
    ) INTO resultado
    FROM producao_diaria;

    RETURN COALESCE(resultado, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_ranking_produtos(periodo_ref text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    data_inicio timestamp;
    data_fim timestamp;
    resultado json;
BEGIN
    -- Define o período de análise
    CASE periodo_ref
        WHEN 'dia' THEN
            data_inicio := current_date - interval '24 hours';
            data_fim := current_date;
        WHEN 'semana' THEN
            data_inicio := date_trunc('week', current_date);
            data_fim := data_inicio + interval '1 week';
        ELSE -- mês
            data_inicio := date_trunc('month', current_date);
            data_fim := data_inicio + interval '1 month';
    END CASE;

    WITH producao_por_produto AS (
        SELECT
            p.nome as produto,
            SUM(rp.quantidade_produzida) as quantidade,
            SUM(rp.quantidade_produzida * p.preco_venda) as valor_total
        FROM ordens_producao op
        JOIN produtos_finais p ON p.id = op.produto_id
        JOIN registro_producao_real rp ON rp.ordem_producao_id = op.id
        WHERE op.data_inicio >= data_inicio AND op.data_inicio < data_fim
        GROUP BY p.id, p.nome
        ORDER BY quantidade DESC
        LIMIT 10
    )
    SELECT json_agg(
        json_build_object(
            'produto', produto,
            'quantidade', quantidade,
            'valor_total', valor_total
        )
    ) INTO resultado
    FROM producao_por_produto;

    RETURN COALESCE(resultado, '[]'::json);
END;
$$;