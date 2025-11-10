-- Migration 036: Melhora campo rendimento_unidades e adiciona comentários
-- Data: 2025-11-06

-- Atualizar comentários para deixar claro o funcionamento
COMMENT ON COLUMN fichas_tecnicas.quantidade IS 
  'Quantidade TOTAL do insumo necessária para produzir o LOTE completo (não por unidade)';

COMMENT ON COLUMN fichas_tecnicas.rendimento_unidades IS 
  'Quantas UNIDADES do produto final esta receita produz. Ex: Receita de cone doce rende 20 cones';

COMMENT ON COLUMN fichas_tecnicas.perda_padrao IS 
  'Percentual de perda/desperdício do insumo no processo. Ex: 5% de perda na farinha';

-- Adicionar coluna para observações da receita (opcional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'fichas_tecnicas' 
    AND column_name = 'observacoes'
  ) THEN
    ALTER TABLE fichas_tecnicas 
    ADD COLUMN observacoes TEXT;
    
    COMMENT ON COLUMN fichas_tecnicas.observacoes IS 
      'Observações gerais sobre a receita, modo de preparo, dicas, etc.';
  END IF;
END $$;

-- Atualizar a view para calcular custo unitário
DROP VIEW IF EXISTS v_fichas_tecnicas_completas;

CREATE OR REPLACE VIEW v_fichas_tecnicas_completas AS
SELECT 
  ft.id,
  ft.produto_final_id,
  pf.nome as produto_nome,
  pf.preco_venda,
  ft.insumo_id,
  i.nome as insumo_nome,
  i.custo_unitario as insumo_custo_unitario,
  ft.quantidade,
  ft.unidade_medida,
  ft.perda_padrao,
  ft.rendimento_unidades,
  ft.instrucoes,
  ft.observacoes,
  ft.tempo_preparo_minutos,
  ft.ordem_producao,
  ft.versao,
  ft.ativo,
  -- Custo do insumo COM perda para o LOTE completo
  (ft.quantidade * (1 + ft.perda_padrao / 100) * i.custo_unitario) as custo_insumo_lote,
  -- Custo do insumo por UNIDADE (divide pelo rendimento)
  CASE 
    WHEN ft.rendimento_unidades > 0 
    THEN (ft.quantidade * (1 + ft.perda_padrao / 100) * i.custo_unitario) / ft.rendimento_unidades
    ELSE 0 
  END as custo_insumo_unitario,
  ft.created_at,
  ft.updated_at
FROM fichas_tecnicas ft
INNER JOIN produtos_finais pf ON ft.produto_final_id = pf.id
INNER JOIN insumos i ON ft.insumo_id = i.id
WHERE ft.ativo = true
ORDER BY pf.nome, ft.ordem_producao;

COMMENT ON VIEW v_fichas_tecnicas_completas IS 
  'View com cálculos de custo por LOTE e por UNIDADE. Rendimento define quantas unidades o lote produz.';
