-- Função que retorna o progresso de produção do dia
CREATE OR REPLACE FUNCTION public.get_progresso_producao_hoje(p_meta_diaria int)
RETURNS TABLE (
    produzido_hoje bigint,
    meta_diaria int,
    percentagem numeric
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(quantidade_produzida), 0)::bigint as produzido_hoje,
        p_meta_diaria as meta_diaria,
        ROUND((COALESCE(SUM(quantidade_produzida), 0)::numeric / NULLIF(p_meta_diaria,0)::numeric) * 100, 1) as percentagem
    FROM ordens_producao
    WHERE public.is_ordem_producao_concluida(status::text)
      AND COALESCE(updated_at::date, data_fim::date) = CURRENT_DATE;
END;
$$;
