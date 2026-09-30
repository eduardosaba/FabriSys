-- ============================================================================
-- MIGRATION: FECHAMENTO UNIFICADO ESTRUTURAL DE PDVs (FabriSys)
-- Data: 2026-09-30
-- Preserva histórico, cria entidade independente e RPC transacional com RLS
-- ============================================================================

-- 1. Criação da Tabela Independente de Fechamento Unificado
CREATE TABLE IF NOT EXISTS public.fechamentos_unificados_pdv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  usuario_fechamento_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  total_faturamento_bruto NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_faturamento_liquido NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  
  -- Somatório automático recuperado dos turnos
  total_dinheiro_informado NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  
  -- Valores consolidados informados no fechamento geral
  total_pix_declarado NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_cartao_debito_declarado NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_cartao_credito_declarado NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_outros_declarado NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  
  -- Conciliação
  total_recebido NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  diferenca_caixa NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  justificativa TEXT NULL,
  
  qtd_turnos INTEGER NOT NULL DEFAULT 0,
  qtd_pdvs INTEGER NOT NULL DEFAULT 0,
  
  status TEXT NOT NULL DEFAULT 'encerrado' CHECK (status IN ('encerrado', 'auditado', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para buscas gerenciais
CREATE INDEX IF NOT EXISTS idx_fechamentos_unificados_org_data 
  ON public.fechamentos_unificados_pdv(organization_id, data DESC);

-- 2. Alteração na Tabela remessas_cargas_pdv
-- Adicionar vínculo com fechamento unificado e flag para histórico legado
ALTER TABLE public.remessas_cargas_pdv
  ADD COLUMN IF NOT EXISTS fechamento_unificado_id UUID NULL,
  ADD COLUMN IF NOT EXISTS legado_inconsistente BOOLEAN NOT NULL DEFAULT FALSE;

-- Constraint de chave estrangeira
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_remessas_fechamento_unificado'
  ) THEN
    ALTER TABLE public.remessas_cargas_pdv
      ADD CONSTRAINT fk_remessas_fechamento_unificado
      FOREIGN KEY (fechamento_unificado_id)
      REFERENCES public.fechamentos_unificados_pdv(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_remessas_fechamento_unificado 
  ON public.remessas_cargas_pdv(fechamento_unificado_id);

-- Garantir constraint de status abrangente
ALTER TABLE public.remessas_cargas_pdv 
  DROP CONSTRAINT IF EXISTS remessas_cargas_pdv_status_check;

ALTER TABLE public.remessas_cargas_pdv 
  ADD CONSTRAINT remessas_cargas_pdv_status_check 
  CHECK (status IN (
    'aberto', 
    'sobras_informadas', 
    'dinheiro_informado', 
    'encerrado', 
    'auditado', 
    'conferido'
  ));

-- 3. Identificação e Preservação dos Registros Legados Inconsistentes
-- Identifica os 36 registros históricos anteriores sem alterar valores monetários
UPDATE public.remessas_cargas_pdv
SET legado_inconsistente = TRUE
WHERE (
  observacoes ILIKE '%Unificado no registro principal%' OR
  observacoes ILIKE '%Fechamento Unificado%' OR
  tipo_fechamento = 'unificado'
) AND created_at < NOW();

-- 4. RLS para fechamentos_unificados_pdv
ALTER TABLE public.fechamentos_unificados_pdv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fechamentos_unificados_org_access" ON public.fechamentos_unificados_pdv;
CREATE POLICY "fechamentos_unificados_org_access" ON public.fechamentos_unificados_pdv
  FOR ALL USING (
    organization_id = auth.uid() OR organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.fechamentos_unificados_pdv TO authenticated;

-- 5. RPC Transacional: fechar_pdvs_unificado
CREATE OR REPLACE FUNCTION public.fechar_pdvs_unificado(
  p_organization_id UUID,
  p_data DATE,
  p_remessa_ids UUID[],
  p_pix_declarado NUMERIC,
  p_cartao_debito_declarado NUMERIC,
  p_cartao_credito_declarado NUMERIC,
  p_outros_declarado NUMERIC DEFAULT 0.00,
  p_justificativa TEXT DEFAULT NULL
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
  v_total_recebido NUMERIC(14,2) := 0.00;
  v_diferenca NUMERIC(14,2) := 0.00;
  
  v_fechamento_id UUID;
  v_ja_fechados UUID[];
BEGIN
  -- 1. Validação básica de autenticação
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Operação não autorizada: usuário não autenticado.';
  END IF;

  -- 2. Validação de organização e permissão do usuário
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

  -- 3. Bloqueio pessimista contra concorrência e corrida
  -- Trava as linhas das remessas para esta transação
  PERFORM id 
  FROM public.remessas_cargas_pdv
  WHERE id = ANY(p_remessa_ids)
    AND organization_id = p_organization_id
  FOR UPDATE;

  -- 4. Verificação de remessas já unificadas anteriormente
  SELECT array_agg(id) INTO v_ja_fechados
  FROM public.remessas_cargas_pdv
  WHERE id = ANY(p_remessa_ids)
    AND fechamento_unificado_id IS NOT NULL;

  IF v_ja_fechados IS NOT NULL AND array_length(v_ja_fechados, 1) > 0 THEN
    RAISE EXCEPTION 'Operação cancelada: % turno(s) já pertencem a outro fechamento unificado.', 
      array_length(v_ja_fechados, 1);
  END IF;

  -- 5. Validação de integridade e recálculo com base no banco persistido
  SELECT
    COUNT(*),
    COUNT(DISTINCT r.local_id),
    COALESCE(SUM(r.valor_dinheiro_gaveta), 0.00),
    COALESCE(SUM(
      COALESCE(NULLIF(r.faturamento_bruto_teorico, 0), r.faturamento_liquido_esperado, 0.00)
    ), 0.00),
    COALESCE(SUM(
      COALESCE(NULLIF(r.faturamento_liquido_esperado, 0), r.faturamento_bruto_teorico, 0.00)
    ), 0.00)
  INTO
    v_total_encontrados,
    v_qtd_pdvs,
    v_dinheiro_total,
    v_faturamento_bruto,
    v_faturamento_liquido
  FROM public.remessas_cargas_pdv r
  WHERE r.id = ANY(p_remessa_ids)
    AND r.organization_id = p_organization_id
    AND r.data = p_data;

  IF v_total_encontrados <> v_total_ids THEN
    RAISE EXCEPTION 'Validação falhou: foram selecionados % registros, mas apenas % pertencem à data % e organização correta.',
      v_total_ids, v_total_encontrados, p_data;
  END IF;

  -- 6. Apuração Financeira
  v_total_recebido := ROUND(
    v_dinheiro_total + 
    COALESCE(p_pix_declarado, 0.00) + 
    COALESCE(p_cartao_debito_declarado, 0.00) + 
    COALESCE(p_cartao_credito_declarado, 0.00) + 
    COALESCE(p_outros_declarado, 0.00),
    2
  );

  v_diferenca := ROUND(v_total_recebido - v_faturamento_liquido, 2);

  -- Se houver diferença maior que R$ 0,05, exige justificativa
  IF ABS(v_diferenca) > 0.05 AND NULLIF(btrim(COALESCE(p_justificativa, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Justificativa obrigatória: diferença de caixa apurada de R$ %.', v_diferenca;
  END IF;

  -- 7. Gravação do Cabeçalho de Fechamento Unificado
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
    v_total_recebido,
    v_diferenca,
    NULLIF(btrim(COALESCE(p_justificativa, '')), ''),
    v_total_ids,
    v_qtd_pdvs,
    'encerrado'
  )
  RETURNING id INTO v_fechamento_id;

  -- 8. Vinculação das Remessas Individuais SEM ZERAR NENHUM DADO!
  -- Preserva: valor_dinheiro_gaveta, itens_grade, faturamento individual, sobras
  UPDATE public.remessas_cargas_pdv
  SET 
    fechamento_unificado_id = v_fechamento_id,
    status = 'encerrado',
    updated_at = NOW()
  WHERE id = ANY(p_remessa_ids);

  -- 9. Retorno com sucesso e totais
  RETURN jsonb_build_object(
    'success', true,
    'fechamento_id', v_fechamento_id,
    'qtd_turnos', v_total_ids,
    'qtd_pdvs', v_qtd_pdvs,
    'total_dinheiro', v_dinheiro_total,
    'total_faturamento', v_faturamento_liquido,
    'total_recebido', v_total_recebido,
    'diferenca_caixa', v_diferenca
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fechar_pdvs_unificado(UUID, DATE, UUID[], NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fechar_pdvs_unificado(UUID, DATE, UUID[], NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated;
