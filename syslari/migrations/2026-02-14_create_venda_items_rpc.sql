-- RPC to insert a venda + itens_venda in a single security-definer function
-- Customize columns and constraints as needed before applying in staging.

-- WARNING: review SECURITY DEFINER functions carefully. Run with elevated DB privileges.

CREATE OR REPLACE FUNCTION public.insert_venda_with_items(p_venda jsonb, p_itens jsonb)
RETURNS TABLE(venda_id uuid) AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Example: adjust column list according to your `vendas` table
  INSERT INTO public.vendas (id, caixa_id, cliente_id, usuario_id, organization_id, total_venda, metodo_pagamento, status, data_criacao)
  SELECT
    COALESCE((p_venda->>'id')::uuid, gen_random_uuid()),
    (p_venda->>'caixa_id')::uuid,
    (p_venda->>'cliente_id')::uuid,
    (p_venda->>'usuario_id')::uuid,
    (p_venda->>'organization_id')::uuid,
    (p_venda->>'total_venda')::numeric,
    p_venda->>'metodo_pagamento',
    p_venda->>'status',
    COALESCE((p_venda->>'data_criacao')::timestamptz, now())
  RETURNING id INTO v_id;

  -- Insert items from JSON array
  -- NOTE: do NOT include `usuario_id` here unless the column exists in `itens_venda`.
  INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal, organization_id)
  SELECT
    v_id,
    (it->>'produto_id')::uuid,
    (it->>'quantidade')::numeric,
    (it->>'preco_unitario')::numeric,
    (it->>'subtotal')::numeric,
    (it->>'organization_id')::uuid
  FROM jsonb_array_elements(p_itens) AS it;

  RETURN QUERY SELECT v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTES:
-- - After creating this function, create a minimal policy allowing only the function (role) to perform inserts, or ensure 'security definer' owner is a trusted role.
-- - Test thoroughly in a staging DB and verify RLS and ownership.

-- Example grant (adjust role names):
-- GRANT EXECUTE ON FUNCTION public.insert_venda_with_items(jsonb, jsonb) TO authenticated;
