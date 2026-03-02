-- View que agrega estoque por tipo de local para widgets/relatórios
CREATE OR REPLACE VIEW vista_distribuicao_estoque AS
SELECT 
    l.nome as local_nome,
    l.tipo as local_tipo,
    SUM(e.quantidade) as total_unidades,
    COUNT(DISTINCT e.produto_id) as mix_produtos
FROM estoque_produtos e
JOIN locais l ON e.local_id = l.id
GROUP BY l.nome, l.tipo;
