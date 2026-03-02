-- Migration idempotente: backup das linhas com valores inesperados,
-- mapeamento para 'pendente' e recriação da constraint.
-- Uso recomendado:
-- 1) Rode apenas o SELECT de preview abaixo e verifique as linhas.
-- 2) Se OK, rode a migration completa.

BEGIN;

-- Tabela de backup persistente (mantém histórico das execuções)
CREATE TABLE IF NOT EXISTS ordens_producao_status_logistica_backup (
  ordem_id UUID,
  previous_status TEXT,
  snapshot_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (ordem_id, previous_status, snapshot_at)
);

-- Tabela de auditoria (se desejar separar audit)
CREATE TABLE IF NOT EXISTS ordens_producao_status_logistica_audit (
  ordem_id UUID,
  previous_status TEXT,
  migrated_to TEXT,
  migrated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir compatibilidade: adicione a coluna migrated_to caso a tabela já exista sem ela
ALTER TABLE ordens_producao_status_logistica_audit
  ADD COLUMN IF NOT EXISTS migrated_to TEXT;

-- PREVIEW: revele quais linhas serão afetadas (execute manualmente primeiro)
-- SELECT id, status_logistica FROM ordens_producao
-- WHERE status_logistica IS NOT NULL
--   AND status_logistica NOT IN ('pendente','em_transito','aguardando_expedicao','entregue','cancelado');

-- 1) Insere no backup apenas entradas que ainda não foram registradas com o mesmo status
INSERT INTO ordens_producao_status_logistica_backup (ordem_id, previous_status)
SELECT id, status_logistica FROM ordens_producao o
WHERE status_logistica IS NOT NULL
  AND status_logistica NOT IN ('pendente','em_transito','aguardando_expedicao','entregue','cancelado')
  AND NOT EXISTS (
    SELECT 1 FROM ordens_producao_status_logistica_backup b
    WHERE b.ordem_id = o.id AND b.previous_status = o.status_logistica
  );

-- 2) Audita intenção de migração (migrated_to = 'pendente') sem duplicar registros
INSERT INTO ordens_producao_status_logistica_audit (ordem_id, previous_status, migrated_to)
SELECT id, status_logistica, 'pendente' FROM ordens_producao o
WHERE status_logistica IS NOT NULL
  AND status_logistica NOT IN ('pendente','em_transito','aguardando_expedicao','entregue','cancelado')
  AND NOT EXISTS (
    SELECT 1 FROM ordens_producao_status_logistica_audit a
    WHERE a.ordem_id = o.id AND a.previous_status = o.status_logistica AND a.migrated_to = 'pendente'
  );

-- 3) Atualiza as linhas mapeando valores inesperados para 'pendente'
UPDATE ordens_producao
SET status_logistica = 'pendente'
WHERE status_logistica IS NOT NULL
  AND status_logistica NOT IN ('pendente','em_transito','aguardando_expedicao','entregue','cancelado');

-- 4) Recria a constraint permitindo os valores novos
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

-- Nota: se quiser reverter, restaure `ordens_producao` a partir de `ordens_producao_status_logistica_backup`.
