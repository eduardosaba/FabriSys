-- 2026-02-17_update_fn_sincronizar_semi_acabado_insumo.sql
-- Recria a função fn_sincronizar_semi_acabado_insumo de forma robusta
-- Usa row_to_json(NEW) para acessar campos opcionais sem erro quando ausentes

BEGIN;

-- Garantir que trigger dependente seja removido antes de recriar a função
DROP TRIGGER IF EXISTS trg_sincronizar_semi_acabado ON public.produtos_finais;

-- Recreate function safely
DROP FUNCTION IF EXISTS public.fn_sincronizar_semi_acabado_insumo();

CREATE OR REPLACE FUNCTION public.fn_sincronizar_semi_acabado_insumo()
RETURNS TRIGGER AS $$
DECLARE
  new_json jsonb;
  v_unidade text := 'UN';
  v_custo numeric := 0;
  has_insumos_org boolean;
  v_org_text text;
  v_prod_text text;
  v_nome text;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Representar NEW como JSON para acessar chaves dinamicamente
    new_json := row_to_json(NEW)::jsonb;

    -- Verifica se tipo é semi_acabado sem acessar NEW.tipo diretamente
    IF (new_json->> 'tipo') = 'semi_acabado' THEN
      v_unidade := COALESCE(new_json->> 'unidade_estoque', 'UN');
      v_custo := COALESCE((new_json->> 'preco_custo')::numeric, 0);
      v_org_text := new_json->> 'organization_id';
      v_prod_text := new_json->> 'id';
      v_nome := new_json->> 'nome';

      has_insumos_org := EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'insumos' AND column_name = 'organization_id'
      );

      IF has_insumos_org THEN
        INSERT INTO public.insumos (organization_id, nome, unidade_medida, unidade_estoque, custo_por_ue, estoque_minimo_alerta, produto_final_id, tipo_insumo, created_at)
        VALUES (
          CASE WHEN v_org_text IS NULL OR v_org_text = '' THEN NULL ELSE v_org_text::uuid END,
          v_nome,
          v_unidade,
          v_unidade,
          v_custo,
          0,
          CASE WHEN v_prod_text IS NULL OR v_prod_text = '' THEN NULL ELSE v_prod_text::uuid END,
          'virtual', NOW()
        )
        ON CONFLICT (organization_id, nome) DO UPDATE
          SET custo_por_ue = EXCLUDED.custo_por_ue,
              produto_final_id = EXCLUDED.produto_final_id;
      ELSE
        INSERT INTO public.insumos (nome, unidade_medida, unidade_estoque, custo_por_ue, estoque_minimo_alerta, produto_final_id, tipo_insumo, created_at)
        VALUES (
          v_nome,
          v_unidade,
          v_unidade,
          v_custo,
          0,
          CASE WHEN v_prod_text IS NULL OR v_prod_text = '' THEN NULL ELSE v_prod_text::uuid END,
          'virtual', NOW()
        )
        ON CONFLICT (nome) DO UPDATE
          SET custo_por_ue = EXCLUDED.custo_por_ue,
              produto_final_id = EXCLUDED.produto_final_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS trg_sincronizar_semi_acabado ON public.produtos_finais;
CREATE TRIGGER trg_sincronizar_semi_acabado
AFTER INSERT OR UPDATE ON public.produtos_finais
FOR EACH ROW
EXECUTE FUNCTION public.fn_sincronizar_semi_acabado_insumo();

COMMIT;
