-- Migration: cria view vw_financeiro_conferencias
BEGIN;

CREATE OR REPLACE VIEW public.vw_financeiro_conferencias AS
SELECT 
    pf.id as fechamento_id,
    COALESCE(pf.data_fechamento, pf.created_at) as data_conferencia,
    pf.organization_id,
    pf.valor_esperado_dinheiro as valor_teorico_estoque,
    pf.valor_informado_dinheiro as dinheiro_pdv,
    -- Observação: colunas de `pix/cartao/ajuste` podem não existir antes da migration.
    -- Versão segura: calcula quebra apenas com os campos presentes por padrão.
    (COALESCE(pf.valor_esperado_dinheiro,0) - COALESCE(pf.valor_informado_dinheiro,0)) as quebra_real,
    (COALESCE(pf.valor_informado_dinheiro,0)) as faturamento_real
FROM public.pos_fechamentos pf
WHERE COALESCE(pf.status, '') <> 'pendente';

COMMIT;
