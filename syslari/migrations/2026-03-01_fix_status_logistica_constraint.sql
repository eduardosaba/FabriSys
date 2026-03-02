-- Migration: Corrige valores inválidos em ordens_producao.status_logistica
-- 1) Faz backup dos valores inválidos em tabela de audit
-- 2) Normaliza valores inválidos para 'pendente' (seguindo política safe)
-- 3) Atualiza constraint para incluir os valores usados pelo frontend
-- Execute este script no Supabase SQL Editor como owner.

BEGIN;

-- 1) Cria tabela de backup/audit se ainda não existir
CREATE TABLE IF NOT EXISTS ordens_producao_status_logistica_backup (
  ordem_id uuid NOT NULL,
  previous_status text,
  migrated_to text,
  recorded_at timestamptz DEFAULT now(),
  PRIMARY KEY (ordem_id, recorded_at)
);

-- Garantir que colunas adicionais existam caso a tabela já tenha sido criada por outra migration anterior
ALTER TABLE ordens_producao_status_logistica_backup
  ADD COLUMN IF NOT EXISTS migrated_to text;

ALTER TABLE ordens_producao_status_logistica_backup
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz DEFAULT now();

-- 2) Inserir linhas que atualmente violariam a nova constraint (valores inesperados)
-- Definir aqui a lista dos valores que consideramos válidos a seguir.
DO $$
DECLARE
  valid_values text[] := ARRAY[
    'pendente', 'aguardando_expedicao', 'enviado', 'recebido', 'entregue', 'cancelado',
    'em_transito', 'aguardando', 'finalizada', 'concluido', 'planejado'
  ];
BEGIN
  INSERT INTO ordens_producao_status_logistica_backup (ordem_id, previous_status, migrated_to)
  SELECT id, status_logistica, 'pendente'
  FROM ordens_producao
  WHERE status_logistica IS NOT NULL
    AND NOT (status_logistica = ANY(valid_values));

  -- 3) Normaliza para 'pendente' os valores inválidos (safe default)
  UPDATE ordens_producao
  SET status_logistica = 'pendente', updated_at = COALESCE(updated_at, now())
  WHERE status_logistica IS NOT NULL
    AND NOT (status_logistica = ANY(valid_values));
END$$;

-- 4) Recria a constraint com a lista de valores agora permitidos
ALTER TABLE ordens_producao DROP CONSTRAINT IF EXISTS ordens_producao_status_logistica_check;

ALTER TABLE ordens_producao
  ADD CONSTRAINT ordens_producao_status_logistica_check
  CHECK (
    status_logistica IS NULL
    OR status_logistica IN (
      'pendente', 'aguardando_expedicao', 'enviado', 'recebido', 'entregue', 'cancelado',
      'em_transito', 'aguardando', 'finalizada', 'concluido', 'planejado'
    )
  );

COMMIT;

-- Observação: este script escolhe 'pendente' como destino para valores desconhecidos.
-- Se preferir mapear valores específicos para outros estados, altere a seção de UPDATE acima
-- antes de executar.
