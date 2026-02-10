-- 080_create_rpc_movimentar_ordem.sql
-- Cria a função RPC `movimentar_ordem` usada pelo Kanban para mover ordens entre estágios
BEGIN;

CREATE OR REPLACE FUNCTION public.movimentar_ordem(
  p_ordem_id uuid,
  p_novo_estagio text,
  p_novo_status text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_ord ordens_producao%ROWTYPE;
BEGIN
  -- Bloqueia a ordem para evitar concorrência
  SELECT * INTO v_ord FROM public.ordens_producao WHERE id = p_ordem_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ordem não encontrada');
  END IF;

  -- Atualiza estágio
  UPDATE public.ordens_producao
  SET estagio_atual = p_novo_estagio,
      updated_at = NOW()
  WHERE id = p_ordem_id;

  -- Atualiza status se informado ou aplica regra simples ao mover para estágio final
  IF p_novo_status IS NOT NULL THEN
    UPDATE public.ordens_producao
    SET status = p_novo_status,
        updated_at = NOW(),
        data_fim = CASE WHEN p_novo_status IN ('finalizada','concluido') THEN NOW() ELSE data_fim END
    WHERE id = p_ordem_id;
  ELSE
    IF p_novo_estagio IN ('concluido','finalizado') THEN
      UPDATE public.ordens_producao
      SET status = 'finalizada', data_fim = NOW(), updated_at = NOW()
      WHERE id = p_ordem_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Ordem movida');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Nota: revise owner/permissões após aplicar no Supabase.
