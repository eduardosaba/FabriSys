-- Script para popular dados de exemplo após a migração
-- Execute este script APÓS executar a migração 048_fix_insumos_schema.sql

-- Garantir que categorias básicas existam
INSERT INTO categorias (nome) VALUES
  ('Laticínios'),
  ('Grãos'),
  ('Embalagens'),
  ('Secos'),
  ('Congelados'),
  ('Conservantes'),
  ('Temperos'),
  ('Utensílios'),
  ('Frutas'),
  ('Verduras'),
  ('Carnes'),
  ('Bebidas')
ON CONFLICT (nome) DO NOTHING;

-- Atualizar insumos existentes com categorias apropriadas (exemplos)
UPDATE insumos SET categoria_id = (
  SELECT id FROM categorias WHERE nome = 'Laticínios' LIMIT 1
) WHERE nome ILIKE '%leite%' OR nome ILIKE '%queijo%' OR nome ILIKE '%manteiga%';

UPDATE insumos SET categoria_id = (
  SELECT id FROM categorias WHERE nome = 'Grãos' LIMIT 1
) WHERE nome ILIKE '%arroz%' OR nome ILIKE '%feijão%' OR nome ILIKE '%trigo%';

UPDATE insumos SET categoria_id = (
  SELECT id FROM categorias WHERE nome = 'Embalagens' LIMIT 1
) WHERE nome ILIKE '%embalagem%' OR nome ILIKE '%saco%' OR nome ILIKE '%caixa%';

UPDATE insumos SET categoria_id = (
  SELECT id FROM categorias WHERE nome = 'Temperos' LIMIT 1
) WHERE nome ILIKE '%sal%' OR nome ILIKE '%pimenta%' OR nome ILIKE '%alho%';

-- Definir valores padrão para unidades duplas nos insumos existentes
UPDATE insumos SET
  unidade_estoque = COALESCE(unidade_estoque, unidade_medida),
  unidade_consumo = COALESCE(unidade_consumo, unidade_estoque),
  fator_conversao = COALESCE(fator_conversao, 1)
WHERE unidade_estoque IS NULL OR unidade_consumo IS NULL OR fator_conversao IS NULL;

-- Exemplos de insumos com unidades duplas
INSERT INTO insumos (
  nome,
  unidade_medida,
  estoque_minimo_alerta,
  categoria_id,
  unidade_estoque,
  custo_por_ue,
  unidade_consumo,
  fator_conversao,
  atributos_dinamicos
) VALUES
  (
    'Leite Integral',
    'L',
    10,
    (SELECT id FROM categorias WHERE nome = 'Laticínios' LIMIT 1),
    'Caixa 1L',
    4.50,
    'ml',
    1000,
    '{"marca": "Italac", "validade_dias": 30}'::jsonb
  ),
  (
    'Farinha de Trigo',
    'kg',
    5,
    (SELECT id FROM categorias WHERE nome = 'Grãos' LIMIT 1),
    'Saco 25kg',
    85.00,
    'g',
    25000,
    '{"tipo": "especial", "proteina_minima": 12}'::jsonb
  ),
  (
    'Açúcar Refinado',
    'kg',
    10,
    (SELECT id FROM categorias WHERE nome = 'Secos' LIMIT 1),
    'Saco 50kg',
    120.00,
    'g',
    50000,
    '{"pureza": "99.5%", "cor": "branco"}'::jsonb
  )
ON CONFLICT (nome) DO UPDATE SET
  categoria_id = EXCLUDED.categoria_id,
  unidade_estoque = EXCLUDED.unidade_estoque,
  custo_por_ue = EXCLUDED.custo_por_ue,
  unidade_consumo = EXCLUDED.unidade_consumo,
  fator_conversao = EXCLUDED.fator_conversao,
  atributos_dinamicos = EXCLUDED.atributos_dinamicos;

-- Mostrar resultado final
SELECT
  i.nome,
  c.nome as categoria,
  i.unidade_estoque,
  i.custo_por_ue,
  i.unidade_consumo,
  i.fator_conversao,
  i.atributos_dinamicos
FROM insumos i
LEFT JOIN categorias c ON i.categoria_id = c.id
ORDER BY c.nome, i.nome
LIMIT 20;