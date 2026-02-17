-- 101_fix_distribuicao_produto_id.sql
-- Garante que a coluna produto_id exista em distribucao_pedidos e copia de produto_final_id se necessário

BEGIN;

ALTER TABLE IF EXISTS public.distribuicao_pedidos
  ADD COLUMN IF NOT EXISTS produto_id uuid;

-- Se houver uma coluna alternativa (produto_final_id), copie os valores para a nova coluna
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distribuicao_pedidos' AND column_name='produto_final_id') THEN
    UPDATE public.distribuicao_pedidos
    SET produto_id = produto_final_id
    WHERE produto_id IS NULL AND produto_final_id IS NOT NULL;
  END IF;
END;
$$;

COMMIT;
