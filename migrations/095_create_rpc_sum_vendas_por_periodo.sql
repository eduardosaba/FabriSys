-- 095_create_rpc_sum_vendas_por_periodo.sql
-- Cria a função RPC `rpc_sum_vendas_por_periodo(p_local_id, p_start, p_end)`
-- Retorna a soma de `total_venda` no período informado; quando p_local_id é NULL soma todos os locais.

BEGIN;

CREATE OR REPLACE FUNCTION public.rpc_sum_vendas_por_periodo(
  p_start timestamptz,
  p_end timestamptz,
  p_local_id uuid DEFAULT NULL
) RETURNS numeric AS $$
DECLARE
  v_sum numeric := 0;
BEGIN
  SELECT COALESCE(SUM(total_venda), 0) INTO v_sum
  FROM public.vendas
  WHERE (p_local_id IS NULL OR local_id = p_local_id)
    AND created_at >= p_start
    AND created_at < p_end;

  RETURN v_sum;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder execução da RPC a roles de aplicativo do Supabase
GRANT EXECUTE ON FUNCTION public.rpc_sum_vendas_por_periodo(timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_sum_vendas_por_periodo(timestamptz, timestamptz, uuid) TO anon;

COMMIT;

-- Após aplicar, revise permissões/owner se necessário para garantir acesso via RPC pelos roles esperados.
