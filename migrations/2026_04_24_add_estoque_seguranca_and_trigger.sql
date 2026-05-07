-- Migration: adiciona coluna estoque_seguranca, tabela remessas e trigger de processamento de recebimento
-- ATENÇÃO: revise nomes de colunas em `estoque_produtos` e `movimentacao_estoque` antes de executar em produção

BEGIN;

-- 1) coluna estoque_seguranca em ordens_producao
ALTER TABLE ordens_producao
  ADD COLUMN IF NOT EXISTS estoque_seguranca INTEGER DEFAULT 0;

COMMENT ON COLUMN ordens_producao.estoque_seguranca IS 'Quantidade extra produzida por decisão da administradora (estoque de segurança)';

-- 2) tabela remessas (ponte para conferência cega / rastreio de cargas)
CREATE TABLE IF NOT EXISTS remessas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem_id uuid,
  destino_id uuid,
  itens jsonb,
  status text DEFAULT 'em_transito', -- em_transito, recebido, divergente
  data_envio timestamptz DEFAULT now(),
  data_recebimento timestamptz,
  criado_em timestamptz DEFAULT now()
);

-- 3) função que processa recebimento e evita duplicidade
CREATE OR REPLACE FUNCTION processar_recebimento_op()
RETURNS TRIGGER AS $$
DECLARE
  qtd_total integer;
BEGIN
  -- Se já estava recebido antes, aborta para evitar duplicidade
  IF OLD.status_logistica = 'recebido' THEN
    RAISE EXCEPTION 'Esta ordem de produção já foi recebida e o estoque já foi atualizado.';
  END IF;

  -- Apenas quando a nova situação for 'recebido'
  IF NEW.status_logistica = 'recebido' THEN
    qtd_total := COALESCE(NEW.quantidade_prevista,0) + COALESCE(NEW.estoque_seguranca,0);

    -- Atualiza estoque_produtos (ajuste de nomes de colunas conforme seu schema)
    UPDATE estoque_produtos
    SET quantidade = quantidade + qtd_total,
        atualizado_em = now()
    WHERE produto_id = NEW.produto_final_id
      AND local_id = NEW.local_destino_id;

    -- Se não existia registro no estoque, cria (opcional)
    IF NOT FOUND THEN
      INSERT INTO estoque_produtos (produto_id, local_id, quantidade, criado_em, atualizado_em)
      VALUES (NEW.produto_final_id, NEW.local_destino_id, qtd_total, now(), now())
      ON CONFLICT (produto_id, local_id) DO NOTHING;
    END IF;

    -- Inserir registro de movimentação para auditoria
    INSERT INTO movimentacao_estoque (
      produto_id,
      local_id,
      quantidade,
      tipo_movimentacao,
      origem_id,
      descricao,
      criado_em
    ) VALUES (
      NEW.produto_final_id,
      NEW.local_destino_id,
      qtd_total,
      'entrada',
      NEW.id,
      'Recebimento de OP: ' || COALESCE(NEW.numero_op::text, NEW.id::text) || ' (inclui estoque_seguranca)',
      now()
    );

    -- Marca data de entrega se não estava preenchida
    IF NEW.data_entrega IS NULL THEN
      NEW.data_entrega := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) trigger: garantir que exista apenas um trigger aplicado
DROP TRIGGER IF EXISTS trg_depois_receber_op ON ordens_producao;

CREATE TRIGGER trg_depois_receber_op
BEFORE UPDATE OF status_logistica ON ordens_producao
FOR EACH ROW
WHEN (NEW.status_logistica = 'recebido' AND OLD.status_logistica IS DISTINCT FROM 'recebido')
EXECUTE FUNCTION processar_recebimento_op();

COMMIT;

-- Observações:
-- - Verifique se as tabelas `estoque_produtos` e `movimentacao_estoque` e suas colunas
--   existem com os nomes usados acima. Caso contrário, ajuste os nomes (produto_id, local_id, quantidade, criado_em, atualizado_em).
-- - Teste em ambiente de staging antes de aplicar em produção.
-- - Para a conferência cega, crie registros em `remessas` com `itens` contendo [{produto_id, qtd_enviada}] e associe ao fluxo de distribuição.
