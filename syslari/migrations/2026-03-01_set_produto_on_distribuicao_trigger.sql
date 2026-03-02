-- Recreate trigger to set produto_id from ordens_producao.produto_final_id
-- Safe drop + create so applying multiple times is idempotent

DROP TRIGGER IF EXISTS trg_set_produto_on_distribuicao ON public.distribuicao_pedidos;
DROP FUNCTION IF EXISTS public.trg_set_produto_on_distribuicao();

CREATE OR REPLACE FUNCTION public.trg_set_produto_on_distribuicao()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.produto_id IS NULL AND NEW.ordem_producao_id IS NOT NULL THEN
    SELECT produto_final_id INTO NEW.produto_id
    FROM public.ordens_producao
    WHERE id = NEW.ordem_producao_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_produto_on_distribuicao
BEFORE INSERT OR UPDATE ON public.distribuicao_pedidos
FOR EACH ROW EXECUTE FUNCTION public.trg_set_produto_on_distribuicao();
