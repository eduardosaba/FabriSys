-- Migration: Atualiza constraint ordens_producao_status_logistica_check
-- Inclui o valor 'aguardando_expedicao' como permitido.
-- IMPORTANTE: revise os valores listados antes de aplicar em produção.

BEGIN;

-- 1) Opcional: cria tabela de auditoria para registrar valores migrados
CREATE TABLE IF NOT EXISTS ordens_producao_status_logistica_audit (
  ordem_id UUID,
  previous_status TEXT,
  migrated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Normaliza valores antigos que não estão na lista aceita
-- Ajuste a lista abaixo se quiser mapear para outro valor em vez de NULL
INSERT INTO ordens_producao_status_logistica_audit (ordem_id, previous_status)
SELECT id, status_logistica FROM ordens_producao
WHERE status_logistica IS NOT NULL
  AND status_logistica NOT IN ('pendente','em_transito','aguardando_expedicao','entregue','cancelado');

UPDATE ordens_producao
SET status_logistica = NULL
WHERE status_logistica IS NOT NULL
  AND status_logistica NOT IN ('pendente','em_transito','aguardando_expedicao','entregue','cancelado');

-- 3) Recria a constraint com os valores adicionais permitidos
ALTER TABLE ordens_producao
  DROP CONSTRAINT IF EXISTS ordens_producao_status_logistica_check;

ALTER TABLE ordens_producao
  ADD CONSTRAINT ordens_producao_status_logistica_check
  CHECK (
    status_logistica IS NULL
    OR status_logistica IN (
      'pendente',
      'em_transito',
      'aguardando_expedicao',
      'entregue',
      'cancelado'
    )
  );

COMMIT;

-- Observação: revise os valores acima antes de executar em produção.
