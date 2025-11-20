-- Script opcional para repopular categoria_id após migração
-- Execute APENAS se precisar restaurar associações de categoria perdidas
-- Este script tenta reassociar insumos às categorias baseado no nome

-- Backup dos dados atuais (por segurança)
CREATE TABLE IF NOT EXISTS insumos_backup_pre_categoria_migration AS
SELECT * FROM insumos;

-- Tentar reassociar baseado em padrões de nome
UPDATE insumos SET categoria_id = (
  SELECT id FROM categorias WHERE nome = 'Laticínios' LIMIT 1
) WHERE categoria_id IS NULL AND (
  nome ILIKE '%leite%' OR
  nome ILIKE '%queijo%' OR
  nome ILIKE '%manteiga%' OR
  nome ILIKE '%creme%' OR
  nome ILIKE '%iogurte%'
);

UPDATE insumos SET categoria_id = (
  SELECT id FROM categorias WHERE nome = 'Grãos' LIMIT 1
) WHERE categoria_id IS NULL AND (
  nome ILIKE '%arroz%' OR
  nome ILIKE '%feijão%' OR
  nome ILIKE '%trigo%' OR
  nome ILIKE '%farinha%' OR
  nome ILIKE '%milho%'
);

UPDATE insumos SET categoria_id = (
  SELECT id FROM categorias WHERE nome = 'Embalagens' LIMIT 1
) WHERE categoria_id IS NULL AND (
  nome ILIKE '%embalagem%' OR
  nome ILIKE '%saco%' OR
  nome ILIKE '%caixa%' OR
  nome ILIKE '%pacote%'
);

UPDATE insumos SET categoria_id = (
  SELECT id FROM categorias WHERE nome = 'Temperos' LIMIT 1
) WHERE categoria_id IS NULL AND (
  nome ILIKE '%sal%' OR
  nome ILIKE '%pimenta%' OR
  nome ILIKE '%alho%' OR
  nome ILIKE '%cebola%' OR
  nome ILIKE '%cominho%'
);

UPDATE insumos SET categoria_id = (
  SELECT id FROM categorias WHERE nome = 'Secos' LIMIT 1
) WHERE categoria_id IS NULL AND (
  nome ILIKE '%açucar%' OR
  nome ILIKE '%café%' OR
  nome ILIKE '%chá%' OR
  nome ILIKE '%biscoito%'
);

UPDATE insumos SET categoria_id = (
  SELECT id FROM categorias WHERE nome = 'Frutas' LIMIT 1
) WHERE categoria_id IS NULL AND (
  nome ILIKE '%maçã%' OR
  nome ILIKE '%banana%' OR
  nome ILIKE '%laranja%' OR
  nome ILIKE '%uva%'
);

UPDATE insumos SET categoria_id = (
  SELECT id FROM categorias WHERE nome = 'Verduras' LIMIT 1
) WHERE categoria_id IS NULL AND (
  nome ILIKE '%alface%' OR
  nome ILIKE '%tomate%' OR
  nome ILIKE '%cenoura%' OR
  nome ILIKE '%batata%'
);

UPDATE insumos SET categoria_id = (
  SELECT id FROM categorias WHERE nome = 'Carnes' LIMIT 1
) WHERE categoria_id IS NULL AND (
  nome ILIKE '%carne%' OR
  nome ILIKE '%frango%' OR
  nome ILIKE '%peixe%' OR
  nome ILIKE '%bovina%'
);

-- Mostrar resultado da reassociação
SELECT
  'Reassociação concluída' as status,
  COUNT(*) as total_insumos,
  COUNT(categoria_id) as insumos_com_categoria,
  COUNT(*) - COUNT(categoria_id) as insumos_sem_categoria
FROM insumos;