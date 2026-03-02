-- 105_create_view_v_auditoria_estoque_geral.sql
-- Cria VIEW para auditoria de estoque (visão consolidada para admins)
CREATE OR REPLACE VIEW public.v_auditoria_estoque_geral AS
SELECT 
    p.nome AS produto,
    l.nome AS local,
    l.tipo AS tipo_local,
    e.quantidade AS saldo_sistema,
    c.nome AS categoria
FROM public.estoque_produtos e
JOIN public.produtos_finais p ON e.produto_id = p.id
JOIN public.locais l ON e.local_id = l.id
LEFT JOIN public.categorias c ON p.categoria_id = c.id
ORDER BY l.nome, p.nome;

-- Nota: aplique esta migration no banco (SQL editor do Supabase) como role proprietária.
