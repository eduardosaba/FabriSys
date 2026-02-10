-- Script de verificação da estrutura da tabela insumos
-- Execute este script para confirmar que todos os campos necessários estão presentes

-- Verificar estrutura da tabela insumos
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    col_description('public.insumos'::regclass, ordinal_position) as description
FROM information_schema.columns
WHERE table_name = 'insumos'
ORDER BY ordinal_position;

-- Verificar constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'insumos'
ORDER BY tc.constraint_name;

-- Verificar índices
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'insumos'
ORDER BY indexname;

-- Contar registros por categoria (se categoria_id estiver populado)
SELECT
    c.nome as categoria_nome,
    COUNT(i.id) as quantidade_insumos
FROM insumos i
LEFT JOIN categorias c ON i.categoria_id = c.id
GROUP BY c.id, c.nome
ORDER BY c.nome;

-- Verificar se campos de unidades duplas estão populados
SELECT
    COUNT(*) as total_insumos,
    COUNT(unidade_estoque) as com_unidade_estoque,
    COUNT(custo_por_ue) as com_custo_por_ue,
    COUNT(unidade_consumo) as com_unidade_consumo,
    COUNT(fator_conversao) as com_fator_conversao,
    COUNT(atributos_dinamicos) as com_atributos_dinamicos
FROM insumos;