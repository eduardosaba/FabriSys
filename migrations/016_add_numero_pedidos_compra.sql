-- Adiciona campo sequencial "numero" aos pedidos de compra
-- Cria sequência, preenche pedidos existentes e define default/unique

-- 1) Criar coluna numero (temporariamente permitindo null para backfill)
ALTER TABLE pedidos_compra
ADD COLUMN IF NOT EXISTS numero INTEGER;

-- 2) Criar sequência se não existir
CREATE SEQUENCE IF NOT EXISTS pedidos_compra_numero_seq
  INCREMENT BY 1
  MINVALUE 1
  START WITH 1
  OWNED BY NONE;

-- 3) Backfill: atribuir números para registros existentes sem numero, na ordem de criação
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM pedidos_compra
)
UPDATE pedidos_compra p
SET numero = r.rn
FROM ranked r
WHERE p.id = r.id AND p.numero IS NULL;

-- 4) Ajustar a sequência para continuar a partir do maior número já usado
SELECT setval('pedidos_compra_numero_seq', COALESCE((SELECT MAX(numero) FROM pedidos_compra), 0));

-- 5) Definir default baseado na sequência e adicionar restrições
ALTER TABLE pedidos_compra
  ALTER COLUMN numero SET DEFAULT nextval('pedidos_compra_numero_seq');

-- Tornar NOT NULL após backfill
ALTER TABLE pedidos_compra
  ALTER COLUMN numero SET NOT NULL;

-- Garantir unicidade do número
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pedidos_compra_numero_key'
  ) THEN
    ALTER TABLE pedidos_compra ADD CONSTRAINT pedidos_compra_numero_key UNIQUE (numero);
  END IF;
END$$;
