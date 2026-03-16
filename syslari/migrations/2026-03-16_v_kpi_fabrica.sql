-- View de suporte para KPIs da Dashboard da Fábrica
CREATE OR REPLACE VIEW v_kpi_fabrica AS
SELECT
    -- Contagem de ordens que ainda estão no fluxo (não chegaram ao estagio 'finalizado')
    (SELECT count(*) FROM ordens_producao WHERE COALESCE(estagio_atual, '') <> 'finalizado') as ops_fila,
      -- Conta apenas distribuições pendentes cuja Ordem de Produção está concluída
       (SELECT count(*)
         FROM distribuicao_pedidos d
         JOIN ordens_producao o ON d.ordem_producao_id = o.id
        WHERE d.status = 'pendente' AND public.is_ordem_producao_concluida(o.status::text)) as envios_pendentes,
    (SELECT COALESCE(sum(e.quantidade), 0)
       FROM estoque_produtos e
       JOIN locais l ON e.local_id = l.id
      WHERE l.tipo = 'fabrica') as total_estoque_fabrica,
    (SELECT count(*)
       FROM estoque_produtos e
       JOIN locais l ON e.local_id = l.id
      WHERE l.tipo = 'fabrica' AND e.quantidade < 20) as itens_estoque_baixo;
