BEGIN;

-- Atualiza logos na tabela de Temas (Sistema)
UPDATE public.user_theme_colors
SET logo_url = REPLACE(logo_url, 'user-logo/', 'logo-plataforma/')
WHERE logo_url LIKE 'user-logo/%';

-- Atualiza logos na tabela de Organizações (logos dos clientes)
UPDATE public.organizations
SET logo_url = REPLACE(logo_url, 'company-logo/', 'logos-clientes/')
WHERE logo_url LIKE 'company-logo/%';

COMMIT;
