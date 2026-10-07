-- ============================================================================
-- MIGRATION: 20261007_correcao_reversao_fechamento_unificado.sql
-- Descrição:
-- 1. Garante permissão de DELETE na tabela fechamentos_unificados_pdv para authenticated.
-- 2. Cria RPC desfazer_fechamento_unificado_pdv para cancelamento atômico e seguro.
-- 3. Atualiza RPC fechar_pdvs_unificado para ignorar vínculos cancelados/órfãos
--    quando a remessa está em processo de fechamento (status 'sobras_informadas').
-- ============================================================================

-- 1. Conceder permissão de DELETE na tabela fechamentos_unificados_pdv
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fechamentos_unificados_pdv TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fechamentos_unificados_pdv TO service_role;

-- 2. RPC para Desfazer / Cancelar Fechamento Unificado com Limpeza Atômica
CREATE OR REPLACE FUNCTION public.desfazer_fechamento_unificado_pdv(
  p_remessa_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fechamento_ids UUID[];
  v_afetadas INTEGER := 0;
BEGIN
  IF p_remessa_ids IS NULL OR array_length(p_remessa_ids, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Nenhuma remessa informada.');
  END IF;

  -- Identifica fechamentos unificados vinculados às remessas
  SELECT array_agg(DISTINCT fechamento_unificado_id) INTO v_fechamento_ids
  FROM public.remessas_cargas_pdv
  WHERE id = ANY(p_remessa_ids)
    AND fechamento_unificado_id IS NOT NULL;

  -- Se houver fechamentos relacionados, desvincula todas as remessas que apontam para eles
  IF v_fechamento_ids IS NOT NULL AND array_length(v_fechamento_ids, 1) > 0 THEN
    UPDATE public.remessas_cargas_pdv
    SET
      fechamento_unificado_id = NULL,
      tipo_fechamento = NULL,
      status = CASE WHEN status IN ('encerrado', 'auditado') THEN 'sobras_informadas' ELSE status END,
      valor_pix_declarado = 0,
      valor_cartao_declarado = 0,
      updated_at = NOW()
    WHERE fechamento_unificado_id = ANY(v_fechamento_ids);

    -- Remove fisicamente os registros órfãos de fechamento unificado
    DELETE FROM public.fechamentos_unificados_pdv
    WHERE id = ANY(v_fechamento_ids);
  END IF;

  -- Garante desvinculação e retorno das remessas solicitadas
  UPDATE public.remessas_cargas_pdv
  SET
    fechamento_unificado_id = NULL,
    tipo_fechamento = NULL,
    status = 'sobras_informadas',
    valor_pix_declarado = 0,
    valor_cartao_declarado = 0,
    updated_at = NOW()
  WHERE id = ANY(p_remessa_ids);

  GET DIAGNOSTICS v_afetadas = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'remessas_afetadas', v_afetadas,
    'fechamentos_removidos', COALESCE(array_length(v_fechamento_ids, 1), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.desfazer_fechamento_unificado_pdv(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desfazer_fechamento_unificado_pdv(UUID[]) TO service_role;

-- 3. Atualização da RPC fechar_pdvs_unificado para permitir re-fechamento sem bloqueio por vínculos órfãos
CREATE OR REPLACE FUNCTION public.fechar_pdvs_unificado(
  p_organization_id UUID,
  p_data DATE,
  p_remessa_ids UUID[],
  p_pix_declarado NUMERIC,
  p_cartao_debito_declarado NUMERIC,
  p_cartao_credito_declarado NUMERIC,
  p_outros_declarado NUMERIC DEFAULT 0.00,
  p_justificativa TEXT DEFAULT NULL,
  p_remessas_updates JSONB DEFAULT NULL,
  p_taxas_operacionais NUMERIC DEFAULT 0.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_org UUID;
  v_total_ids INTEGER := COALESCE(array_length(p_remessa_ids, 1), 0);
  v_total_encontrados INTEGER := 0;
  v_qtd_pdvs INTEGER := 0;
  
  v_dinheiro_total NUMERIC(14,2) := 0.00;
  v_faturamento_bruto NUMERIC(14,2) := 0.00;
  v_faturamento_liquido NUMERIC(14,2) := 0.00;
  v_total_digital NUMERIC(14,2) := 0.00;
  v_total_bruto_recebido NUMERIC(14,2) := 0.00;
  v_total_liquido_apos_taxas NUMERIC(14,2) := 0.00;
  v_diferenca NUMERIC(14,2) := 0.00;
  
  v_fechamento_id UUID;
  v_ja_fechados UUID[];
  v_pendentes_sobra UUID[];
  v_pendentes_dinheiro UUID[];
  v_upd RECORD;
BEGIN
  -- 1. Validação de autenticação
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Operação não autorizada: usuário não autenticado.';
  END IF;

  -- 2. Validação de organização e perfil do usuário
  SELECT organization_id INTO v_user_org
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_org IS NULL OR v_user_org <> p_organization_id THEN
    RAISE EXCEPTION 'Operação não autorizada para a organização informada.';
  END IF;

  IF v_total_ids = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um turno para o fechamento unificado.';
  END IF;

  IF COALESCE(p_pix_declarado, 0) < 0 OR 
     COALESCE(p_cartao_debito_declarado, 0) < 0 OR 
     COALESCE(p_cartao_credito_declarado, 0) < 0 OR 
     COALESCE(p_outros_declarado, 0) < 0 THEN
    RAISE EXCEPTION 'Os valores de recebimentos digitais não podem ser negativos.';
  END IF;

  -- Validação de Taxas Financeiras Operacionais
  v_total_digital := COALESCE(p_pix_declarado, 0) + 
                     COALESCE(p_cartao_debito_declarado, 0) + 
                     COALESCE(p_cartao_credito_declarado, 0) + 
                     COALESCE(p_outros_declarado, 0);

  IF COALESCE(p_taxas_operacionais, 0) < 0 THEN
    RAISE EXCEPTION 'As taxas financeiras operacionais não podem ser negativas.';
  END IF;

  IF COALESCE(p_taxas_operacionais, 0) > v_total_digital THEN
    RAISE EXCEPTION 'As taxas operacionais (R$ %) não podem ser superiores ao total das operações digitais (R$ %).',
      ROUND(p_taxas_operacionais, 2), ROUND(v_total_digital, 2);
  END IF;

  -- 3. Bloqueio pessimista contra concorrência e condições de corrida
  PERFORM id 
  FROM public.remessas_cargas_pdv
  WHERE id = ANY(p_remessa_ids)
    AND organization_id = p_organization_id
  FOR UPDATE;

  -- 4. Verificação de remessas já unificadas previamente em outro fechamento ATIVO
  -- Permite fechamento se a remessa estiver com status 'sobras_informadas' ou 'aberto'
  -- ou se o fechamento unificado anterior estiver cancelado.
  SELECT array_agg(r.id) INTO v_ja_fechados
  FROM public.remessas_cargas_pdv r
  JOIN public.fechamentos_unificados_pdv f ON f.id = r.fechamento_unificado_id
  WHERE r.id = ANY(p_remessa_ids)
    AND r.fechamento_unificado_id IS NOT NULL
    AND f.status <> 'cancelado'
    AND r.status IN ('encerrado', 'auditado', 'conferido', 'concluido');

  IF v_ja_fechados IS NOT NULL AND array_length(v_ja_fechados, 1) > 0 THEN
    RAISE EXCEPTION 'Operação cancelada: % turno(s) já pertencem a outro fechamento unificado ativo.', 
      array_length(v_ja_fechados, 1);
  END IF;

  -- 5. Atualização atômica opcional das remessas (sobras / faturamento recalculado)
  IF p_remessas_updates IS NOT NULL AND jsonb_typeof(p_remessas_updates) = 'array' THEN
    FOR v_upd IN 
      SELECT * FROM jsonb_to_recordset(p_remessas_updates) AS x(
        id UUID,
        itens_grade JSONB,
        qtd_total_retorno NUMERIC,
        faturamento_bruto_teorico NUMERIC,
        faturamento_liquido_esperado NUMERIC
      )
    LOOP
      UPDATE public.remessas_cargas_pdv
      SET
        itens_grade = COALESCE(v_upd.itens_grade, itens_grade),
        qtd_total_retorno = COALESCE(v_upd.qtd_total_retorno, qtd_total_retorno),
        faturamento_bruto_teorico = COALESCE(v_upd.faturamento_bruto_teorico, faturamento_bruto_teorico),
        faturamento_liquido_esperado = COALESCE(v_upd.faturamento_liquido_esperado, faturamento_liquido_esperado),
        status = 'dinheiro_informado',
        updated_at = NOW()
      WHERE id = v_upd.id 
        AND organization_id = p_organization_id
        AND data = p_data;
    END LOOP;
  END IF;

  -- 5.1. Validação de Sobras Pendentes (Bloqueia remessas com status 'aberto')
  SELECT array_agg(id) INTO v_pendentes_sobra
  FROM public.remessas_cargas_pdv
  WHERE id = ANY(p_remessa_ids)
    AND organization_id = p_organization_id
    AND status = 'aberto';

  IF v_pendentes_sobra IS NOT NULL AND array_length(v_pendentes_sobra, 1) > 0 THEN
    RAISE EXCEPTION 'Operação cancelada: % turno(s) possuem sobras pendentes de conferência.',
      array_length(v_pendentes_sobra, 1);
  END IF;

  -- 5.2. Validação de Dinheiro Pendente (Bloqueia remessas sem conferência de gaveta)
  SELECT array_agg(id) INTO v_pendentes_dinheiro
  FROM public.remessas_cargas_pdv
  WHERE id = ANY(p_remessa_ids)
    AND organization_id = p_organization_id
    AND (
      valor_dinheiro_gaveta IS NULL 
      OR (
        status = 'sobras_informadas' 
        AND (p_remessas_updates IS NULL OR NOT (p_remessas_updates @> jsonb_build_array(jsonb_build_object('id', id))))
      )
    );

  IF v_pendentes_dinheiro IS NOT NULL AND array_length(v_pendentes_dinheiro, 1) > 0 THEN
    RAISE EXCEPTION 'Operação cancelada: % turno(s) não possuem o valor de dinheiro em gaveta informado.',
      array_length(v_pendentes_dinheiro, 1);
  END IF;

  -- 6. Apuração Consolidada dos Turnos Elegíveis
  SELECT 
    COUNT(*),
    COUNT(DISTINCT local_id),
    COALESCE(SUM(COALESCE(valor_dinheiro_gaveta, 0.00)), 0.00),
    COALESCE(SUM(COALESCE(faturamento_bruto_teorico, 0.00)), 0.00),
    COALESCE(SUM(COALESCE(faturamento_liquido_esperado, 0.00)), 0.00)
  INTO 
    v_total_encontrados,
    v_qtd_pdvs,
    v_dinheiro_total,
    v_faturamento_bruto,
    v_faturamento_liquido
  FROM public.remessas_cargas_pdv
  WHERE id = ANY(p_remessa_ids)
    AND organization_id = p_organization_id
    AND data = p_data;

  IF v_total_encontrados <> v_total_ids THEN
    RAISE EXCEPTION 'Inconsistência nos registros: esperados %, encontrados % turnos válidos.',
      v_total_ids, v_total_encontrados;
  END IF;

  -- 7. Cálculos de Conciliação
  v_total_bruto_recebido := v_dinheiro_total + v_total_digital;
  v_total_liquido_apos_taxas := v_total_bruto_recebido - COALESCE(p_taxas_operacionais, 0.00);
  v_diferenca := v_total_bruto_recebido - v_faturamento_liquido;

  -- Se houver diferença maior que R$ 0,05, exige justificativa
  IF ABS(v_diferenca) > 0.05 AND NULLIF(btrim(COALESCE(p_justificativa, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Justificativa obrigatória: diferença de caixa apurada de R$ %.', v_diferenca;
  END IF;

  -- 8. Gravação Atômica do Fechamento Unificado
  INSERT INTO public.fechamentos_unificados_pdv (
    organization_id,
    data,
    usuario_fechamento_id,
    total_faturamento_bruto,
    total_faturamento_liquido,
    total_dinheiro_informado,
    total_pix_declarado,
    total_cartao_debito_declarado,
    total_cartao_credito_declarado,
    total_outros_declarado,
    total_taxas_operacionais,
    total_liquido_apos_taxas,
    total_recebido,
    diferenca_caixa,
    justificativa,
    qtd_turnos,
    qtd_pdvs,
    status
  )
  VALUES (
    p_organization_id,
    p_data,
    v_user_id,
    v_faturamento_bruto,
    v_faturamento_liquido,
    v_dinheiro_total,
    COALESCE(p_pix_declarado, 0.00),
    COALESCE(p_cartao_debito_declarado, 0.00),
    COALESCE(p_cartao_credito_declarado, 0.00),
    COALESCE(p_outros_declarado, 0.00),
    COALESCE(p_taxas_operacionais, 0.00),
    v_total_liquido_apos_taxas,
    v_total_bruto_recebido,
    v_diferenca,
    NULLIF(btrim(COALESCE(p_justificativa, '')), ''),
    v_total_ids,
    v_qtd_pdvs,
    'encerrado'
  )
  RETURNING id INTO v_fechamento_id;

  -- 9. Vinculação das Remessas Individuais
  UPDATE public.remessas_cargas_pdv
  SET 
    fechamento_unificado_id = v_fechamento_id,
    status = 'encerrado',
    tipo_fechamento = 'unificado',
    updated_at = NOW()
  WHERE id = ANY(p_remessa_ids);

  -- 10. Retorno estruturado com todos os indicadores financeiros
  RETURN jsonb_build_object(
    'success', true,
    'fechamento_id', v_fechamento_id,
    'qtd_turnos', v_total_ids,
    'qtd_pdvs', v_qtd_pdvs,
    'total_dinheiro', v_dinheiro_total,
    'total_faturamento', v_faturamento_liquido,
    'total_bruto_recebido', v_total_bruto_recebido,
    'total_taxas_operacionais', COALESCE(p_taxas_operacionais, 0.00),
    'total_liquido_apos_taxas', v_total_liquido_apos_taxas,
    'total_recebido', v_total_bruto_recebido,
    'diferenca_caixa', v_diferenca
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fechar_pdvs_unificado(UUID, DATE, UUID[], NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fechar_pdvs_unificado(UUID, DATE, UUID[], NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION public.fechar_pdvs_unificado(UUID, DATE, UUID[], NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fechar_pdvs_unificado(UUID, DATE, UUID[], NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB, NUMERIC) TO service_role;
