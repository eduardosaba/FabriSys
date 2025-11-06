-- Configuração das views e funções para análise de produção
-- Migrate up

-- View para análise de eficiência de produção
CREATE OR REPLACE VIEW vw_analise_producao AS
SELECT 
  op.numero_op,
  op.data_prevista,
  op.data_inicio,
  op.data_fim,
  pf.nome AS produto,
  op.quantidade_prevista,
  COALESCE(SUM(rp.quantidade_produzida), 0) AS quantidade_produzida,
  COALESCE(SUM(rp.quantidade_perda), 0) AS quantidade_perda,
  CASE 
    WHEN op.quantidade_prevista > 0 
    THEN ROUND((COALESCE(SUM(rp.quantidade_produzida), 0)::DECIMAL / op.quantidade_prevista) * 100, 2)
    ELSE 0
  END AS eficiencia_percentual,
  op.custo_previsto,
  op.status,
  op.created_by,
  op.finalizado_por
FROM ordens_producao op
LEFT JOIN registro_producao_real rp ON rp.ordem_producao_id = op.id
JOIN produtos_finais pf ON pf.id = op.produto_final_id
GROUP BY op.id, pf.id;

-- View para análise de custos de produção
CREATE OR REPLACE VIEW vw_analise_custos_producao AS
WITH custos_reais AS (
  SELECT 
    op.id AS ordem_producao_id,
    op.numero_op,
    pf.nome AS produto,
    op.quantidade_prevista,
    COALESCE(SUM(rp.quantidade_produzida), 0) AS quantidade_produzida,
    COALESCE(SUM(rp.quantidade_perda), 0) AS quantidade_perda,
    op.custo_previsto,
    CASE 
      WHEN COALESCE(SUM(rp.quantidade_produzida), 0) > 0 
      THEN op.custo_previsto * (COALESCE(SUM(rp.quantidade_perda), 0)::DECIMAL / COALESCE(SUM(rp.quantidade_produzida), 0))
      ELSE 0
    END AS custo_perda
  FROM ordens_producao op
  LEFT JOIN registro_producao_real rp ON rp.ordem_producao_id = op.id
  JOIN produtos_finais pf ON pf.id = op.produto_final_id
  WHERE op.status = 'finalizada'
  GROUP BY op.id, pf.id
)
SELECT 
  numero_op,
  produto,
  quantidade_prevista,
  quantidade_produzida,
  quantidade_perda,
  custo_previsto,
  custo_perda,
  CASE 
    WHEN quantidade_produzida > 0 
    THEN ROUND((custo_previsto + custo_perda) / quantidade_produzida, 2)
    ELSE 0
  END AS custo_unitario_real
FROM custos_reais;

-- Função para calcular KPIs de produção por período
CREATE OR REPLACE FUNCTION calcular_kpis_producao(
  data_inicio DATE,
  data_fim DATE
)
RETURNS TABLE (
  total_ordens_producao INTEGER,
  total_quantidade_prevista INTEGER,
  total_quantidade_produzida INTEGER,
  total_perdas INTEGER,
  eficiencia_media DECIMAL(5,2),
  custo_total_previsto DECIMAL(10,2),
  custo_total_perdas DECIMAL(10,2),
  taxa_aproveitamento_percentual DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH metricas AS (
    SELECT 
      COUNT(DISTINCT op.id) AS total_ordens,
      SUM(op.quantidade_prevista) AS total_previsto,
      COALESCE(SUM(rp.quantidade_produzida), 0) AS total_produzido,
      COALESCE(SUM(rp.quantidade_perda), 0) AS total_perdas,
      AVG(
        CASE 
          WHEN op.quantidade_prevista > 0 
          THEN (COALESCE(SUM(rp.quantidade_produzida), 0)::DECIMAL / op.quantidade_prevista) * 100
          ELSE 0
        END
      ) AS eficiencia,
      SUM(op.custo_previsto) AS custo_previsto,
      SUM(
        CASE 
          WHEN COALESCE(SUM(rp.quantidade_produzida), 0) > 0 
          THEN op.custo_previsto * (COALESCE(SUM(rp.quantidade_perda), 0)::DECIMAL / COALESCE(SUM(rp.quantidade_produzida), 0))
          ELSE 0
        END
      ) AS custo_perdas
    FROM ordens_producao op
    LEFT JOIN registro_producao_real rp ON rp.ordem_producao_id = op.id
    WHERE op.data_prevista BETWEEN data_inicio AND data_fim
    GROUP BY op.id
  )
  SELECT
    COUNT(*)::INTEGER AS total_ordens_producao,
    SUM(total_previsto)::INTEGER AS total_quantidade_prevista,
    SUM(total_produzido)::INTEGER AS total_quantidade_produzida,
    SUM(total_perdas)::INTEGER AS total_perdas,
    ROUND(AVG(eficiencia), 2) AS eficiencia_media,
    ROUND(SUM(custo_previsto), 2) AS custo_total_previsto,
    ROUND(SUM(custo_perdas), 2) AS custo_total_perdas,
    ROUND(
      (SUM(total_produzido)::DECIMAL / NULLIF(SUM(total_previsto), 0)) * 100,
      2
    ) AS taxa_aproveitamento_percentual
  FROM metricas;
END;
$$ LANGUAGE plpgsql;