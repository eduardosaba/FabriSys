-- Cria tabela de alertas e função que gera alertas automáticos
CREATE TABLE IF NOT EXISTS alertas_fabrica (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo text NOT NULL,
    mensagem text NOT NULL,
    severidade text DEFAULT 'media',
    lido boolean DEFAULT false,
    organization_id uuid,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE alertas_fabrica
    ADD CONSTRAINT fk_alertas_organizations FOREIGN KEY (organization_id) REFERENCES organizations(id);

CREATE OR REPLACE FUNCTION public.gerar_alertas_automaticos(p_org_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    -- 1. Alerta de Stock Baixo
    INSERT INTO alertas_fabrica (tipo, mensagem, severidade, organization_id)
    SELECT 
        'estoque_baixo',
        'O produto ' || p.nome || ' está com apenas ' || e.quantidade || ' unidades na fábrica.',
        'critica',
        p_org_id
    FROM estoque_produtos e
    JOIN produtos_finais p ON e.produto_id = p.id
    JOIN locais l ON e.local_id = l.id
    WHERE l.tipo = 'fabrica' 
    AND e.quantidade < 50
    AND e.organization_id = p_org_id
    ON CONFLICT DO NOTHING;

    -- 2. Alerta de Atraso na Entrega (Mais de 4 horas em trânsito)
    INSERT INTO alertas_fabrica (tipo, mensagem, severidade, organization_id)
    SELECT 
        'atraso_logistica',
        'A carga para ' || l.nome || ' está em trânsito há mais de 4 horas.',
        'media',
        p_org_id
    FROM distribuicao_pedidos d
    JOIN locais l ON d.local_destino_id = l.id
    WHERE d.status = 'enviado' 
    AND d.updated_at < (now() - interval '4 hours')
    AND d.organization_id = p_org_id
    ON CONFLICT DO NOTHING;
END;
$$;
