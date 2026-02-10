-- 081_sync_movimentacao_para_estoque.sql
-- Cria função trigger que sincroniza inserções em `movimentacao_estoque` para `estoque_produtos`.
-- A lógica tenta identificar a loja/fábrica como destino/origem automaticamente.
BEGIN;

CREATE OR REPLACE FUNCTION public.sync_movimentacao_para_estoque()
RETURNS trigger AS $$
DECLARE
  v_produto uuid := NEW.produto_id;
  v_qtd numeric := COALESCE(NEW.quantidade, 0);
  v_tipo text := COALESCE(NEW.tipo_movimento, '');
  v_local uuid;
BEGIN
  IF v_produto IS NULL THEN
    RETURN NEW;
  END IF;

  -- Tenta derivar um local de fábrica: primeiro busca em `locais` com tipo 'fabrica'
  SELECT id INTO v_local FROM public.locais WHERE tipo = 'fabrica' LIMIT 1;

  IF v_local IS NULL THEN
    -- Se não existir fábrica cadastrada, aborta silently
    RAISE NOTICE 'sync_movimentacao_para_estoque: nenhum local fabrica encontrado; ignorando.';
    RETURN NEW;
  END IF;

  IF v_tipo ILIKE 'entrada%' THEN
    INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade, updated_at)
    VALUES (v_produto, v_local, v_qtd, NOW())
    ON CONFLICT (produto_id, local_id) DO UPDATE
      SET quantidade = estoque_produtos.quantidade + EXCLUDED.quantidade,
          updated_at = NOW();
  ELSE
    -- considera como saída / decremento
    INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade, updated_at)
    VALUES (v_produto, v_local, GREATEST(0, v_qtd), NOW())
    ON CONFLICT (produto_id, local_id) DO UPDATE
      SET quantidade = GREATEST(0, estoque_produtos.quantidade - EXCLUDED.quantidade),
          updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger após insert em movimentacao_estoque para manter estoque_produtos compatível
DROP TRIGGER IF EXISTS trigger_sync_movimentacao_para_estoque ON public.movimentacao_estoque;
CREATE TRIGGER trigger_sync_movimentacao_para_estoque
  AFTER INSERT ON public.movimentacao_estoque
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_movimentacao_para_estoque();

COMMIT;

-- Observação: essa abordagem assume que entradas de produção devem aumentar o estoque
-- na 'fábrica' (locais.tipo='fabrica'). Ajuste conforme a modelagem da sua instância.
