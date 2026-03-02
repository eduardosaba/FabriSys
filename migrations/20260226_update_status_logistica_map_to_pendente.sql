-- Migration: Normaliza valores inesperados de status_logistica para 'pendente'
-- Faz um SELECT de preview, insere auditoria, atualiza os valores e recria a constraint.
-- Revise o SELECT antes de executar no ambiente de produção.

BEGIN;

-- Preview: linhas que serão afetadas
-- Execute manualmente primeiro para revisar o que será alterado.
SELECT id, status_logistica FROM ordens_producao
WHERE status_logistica IS NOT NULL
  AND status_logistica NOT IN ('pendente','em_transito','aguardando_expedicao','entregue','cancelado');

-- Cria tabela de auditoria caso não exista
CREATE TABLE IF NOT EXISTS ordens_producao_status_logistica_audit (
  ordem_id UUID,
  previous_status TEXT,
  migrated_to TEXT,
  migrated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir compatibilidade com versões anteriores: adicione a coluna migrated_to
ALTER TABLE ordens_producao_status_logistica_audit
  ADD COLUMN IF NOT EXISTS migrated_to TEXT;

-- Registra os valores que serão migrados (mapeando para 'pendente')
INSERT INTO ordens_producao_status_logistica_audit (ordem_id, previous_status, migrated_to)
SELECT id, status_logistica, 'pendente' FROM ordens_producao
WHERE status_logistica IS NOT NULL
  AND status_logistica NOT IN ('pendente','em_transito','aguardando_expedicao','entregue','cancelado');

-- Atualiza as linhas mapeando valores inesperados para 'pendente'
UPDATE ordens_producao
SET status_logistica = 'pendente'
WHERE status_logistica IS NOT NULL
  AND status_logistica NOT IN ('pendente','em_transito','aguardando_expedicao','entregue','cancelado');

-- Recria a constraint permitindo os valores novos
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

-- Observação: execute o SELECT acima antes de aplicar a migração definitiva.
