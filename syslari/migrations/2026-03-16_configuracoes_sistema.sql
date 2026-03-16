-- Cria tabela de configurações do sistema (meta de produção entre outras)
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id),
    chave text NOT NULL,
    valor text NOT NULL,
    descricao text,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(organization_id, chave)
);

-- Exemplo: inserir meta inicial para organização da Larissa (ajuste conforme necessário)
INSERT INTO public.configuracoes_sistema (organization_id, chave, valor, descricao)
VALUES ('ce573296-9b54-4bc9-882e-f88152b670e8', 'meta_producao_diaria', '1000', 'Quantidade de produtos que a fábrica deve produzir por dia')
ON CONFLICT (organization_id, chave) DO UPDATE SET valor = EXCLUDED.valor;
