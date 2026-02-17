-- 099_check_bases_disponiveis.sql
-- Função que verifica se as bases (semi-acabados) necessárias para uma OP estão disponíveis

BEGIN;

CREATE OR REPLACE FUNCTION public.check_bases_disponiveis(p_op_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'tem_base', COALESCE(bool_and(i.quantidade >= ft.quantidade), true),
        'detalhes', jsonb_agg(jsonb_build_object(
            'nome', i.nome,
            'necessario', ft.quantidade,
            'disponivel', COALESCE(ip.quantidade, 0),
            'ok', (COALESCE(ip.quantidade,0) >= ft.quantidade)
        ))
    ) INTO v_result
    FROM public.ordens_producao op
    JOIN public.ficha_tecnica ft ON op.produto_final_id = ft.produto_pai_id
    LEFT JOIN public.insumos i ON ft.insumo_id = i.id
    LEFT JOIN public.estoque_produtos ip ON ip.produto_id = i.id -- estoque da geladeira (insumos)
      AND ip.local_id = (
         SELECT id FROM public.locais WHERE organization_id = op.organization_id AND tipo = 'fabrica' LIMIT 1
      )
    WHERE op.id = p_op_id AND i.tipo = 'semi_acabado';

    RETURN COALESCE(v_result, '{"tem_base": true, "detalhes": []}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- permissões (ajuste roles conforme projeto)
GRANT EXECUTE ON FUNCTION public.check_bases_disponiveis(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_bases_disponiveis(uuid) TO anon;

COMMIT;
