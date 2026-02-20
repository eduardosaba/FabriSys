-- Migration: prefer destination local for sync_movimentacao_para_estoque
-- Created: 2026-02-19
-- Idempotent: replaces function to prefer NEW.destino when valid

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_movimentacao_para_estoque()
RETURNS trigger AS $$
DECLARE
  v_produto uuid := NEW.produto_id;
  v_qtd numeric := COALESCE(NEW.quantidade, 0);
  v_tipo text := COALESCE(NEW.tipo_movimento, '');
  v_local uuid;
  v_dest_text text := COALESCE(NEW.destino::text, '');
BEGIN
  IF v_produto IS NULL THEN
    RETURN NEW;
  END IF;

  -- Preferir `NEW.destino` quando for um UUID válido e existir em `locais`
  IF v_dest_text <> '' THEN
    BEGIN
      v_local := v_dest_text::uuid;
      IF EXISTS (SELECT 1 FROM public.locais WHERE id = v_local) THEN
        -- usa v_local como destino
        NULL; -- v_local já preenchido
      ELSE
        v_local := NULL;
      END IF;
    EXCEPTION WHEN others THEN
      v_local := NULL;
    END;
  END IF;

  -- Se não veio destino válido, tentar localizar fábrica na organização
  IF v_local IS NULL THEN
    SELECT id INTO v_local FROM public.locais WHERE tipo = 'fabrica' OR tipo = 'producao' LIMIT 1;
  END IF;

  IF v_local IS NULL THEN
    RAISE NOTICE 'sync_movimentacao_para_estoque: nenhum local alvo encontrado; ignorando.';
    RETURN NEW;
  END IF;

  IF v_tipo ILIKE 'entrada%' THEN
    INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade, updated_at)
    VALUES (v_produto, v_local, v_qtd, NOW())
    ON CONFLICT (produto_id, local_id) DO UPDATE
      SET quantidade = estoque_produtos.quantidade + EXCLUDED.quantidade,
          updated_at = NOW();
  ELSE
    INSERT INTO public.estoque_produtos (produto_id, local_id, quantidade, updated_at)
    VALUES (v_produto, v_local, GREATEST(0, v_qtd), NOW())
    ON CONFLICT (produto_id, local_id) DO UPDATE
      SET quantidade = GREATEST(0, estoque_produtos.quantidade - EXCLUDED.quantidade),
          updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_sync_movimentacao_para_estoque ON public.movimentacao_estoque;
CREATE TRIGGER trigger_sync_movimentacao_para_estoque
  AFTER INSERT ON public.movimentacao_estoque
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_movimentacao_para_estoque();

COMMIT;
