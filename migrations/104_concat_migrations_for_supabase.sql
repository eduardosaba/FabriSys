-- Migration concatenada: 101 + 102 + 103
-- Objetivo: adicionar `dias_funcionamento` em `locais`, `dias_defuncionamento` e `meta_total` em `metas_vendas`.

-- 101_add_dias_funcionamento_locais.sql
BEGIN;

ALTER TABLE locais ADD COLUMN IF NOT EXISTS dias_funcionamento smallint[];

-- Inicializar registros existentes com todos os dias selecionados caso nulo
UPDATE locais
SET dias_funcionamento = ARRAY[0,1,2,3,4,5,6]
WHERE dias_funcionamento IS NULL;

COMMIT;

-- 102_add_dias_defuncionamento_metas_vendas.sql
BEGIN;

ALTER TABLE metas_vendas ADD COLUMN IF NOT EXISTS dias_defuncionamento integer;

-- Não inicializamos valores existentes automaticamente (pode ser calculado retroativamente se necessário)

COMMIT;

-- 103_add_meta_total_metas_vendas.sql
BEGIN;

ALTER TABLE metas_vendas ADD COLUMN IF NOT EXISTS meta_total numeric(14,2);

-- Não inicializamos valores existentes automaticamente (pode ser calculado retroativamente se necessário)

COMMIT;
