CREATE OR REPLACE FUNCTION public.calcular_kpis_producao(periodo_ref text)
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
            data_inicio := current_date;
            data_fim := current_date + interval '1 day';
        WHEN 'semana' THEN
            data_inicio := date_trunc('week', current_date);
            data_fim := data_inicio + interval '1 week';
        ELSE -- mês
            data_inicio := date_trunc('month', current_date);
            data_fim := data_inicio + interval '1 month';
    END CASE;

    WITH producao_periodo AS (
        SELECT
            op.id,
            op.quantidade_prevista,
            COALESCE(SUM(rp.quantidade_produzida), 0) as qtd_produzida,
            COALESCE(SUM(rp.quantidade_perdida), 0) as qtd_perdida,
            EXTRACT(EPOCH FROM (COALESCE(op.data_fim, current_timestamp) - op.data_inicio)) / 3600 as tempo_producao,
            COALESCE(p.preco_venda * SUM(rp.quantidade_produzida), 0) as valor_produzido,
            COALESCE(p.cmp * (SUM(rp.quantidade_produzida) + SUM(rp.quantidade_perdida)), 0) as custo_total
        FROM ordens_producao op
        LEFT JOIN registro_producao_real rp ON rp.ordem_producao_id = op.id
        LEFT JOIN produtos_finais p ON p.id = op.produto_id
        WHERE op.data_inicio >= data_inicio AND op.data_inicio < data_fim
        GROUP BY op.id, op.quantidade_prevista, op.data_inicio, op.data_fim, p.preco_venda, p.cmp
    )
    SELECT json_build_object(
        'total_ordens', COUNT(*),
        'total_produzido', COALESCE(SUM(qtd_produzida), 0),
        'eficiencia', CASE 
            WHEN SUM(quantidade_prevista) > 0 
            THEN ROUND(100.0 * SUM(qtd_produzida) / SUM(quantidade_prevista), 1)
            ELSE 0 
        END,
        'tempo_medio', CASE 
            WHEN COUNT(*) > 0 
            THEN ROUND(AVG(tempo_producao), 1)
            ELSE 0 
        END,
        'custo_total', COALESCE(SUM(custo_total), 0),
        'taxa_desperdicio', CASE 
            WHEN SUM(qtd_produzida) + SUM(qtd_perdida) > 0 
            THEN ROUND(100.0 * SUM(qtd_perdida) / (SUM(qtd_produzida) + SUM(qtd_perdida)), 1)
            ELSE 0 
        END
    ) INTO resultado
    FROM producao_periodo;

    RETURN resultado;
END;
$$;