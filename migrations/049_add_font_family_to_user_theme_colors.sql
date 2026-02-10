-- Adiciona coluna font_family à tabela user_theme_colors
ALTER TABLE user_theme_colors
ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Inter';

-- Adiciona coluna company_logo_url à tabela user_theme_colors
ALTER TABLE user_theme_colors
ADD COLUMN IF NOT EXISTS company_logo_url text;

-- Atualiza registros existentes com valor padrão
UPDATE user_theme_colors
SET font_family = 'Inter'
WHERE font_family IS NULL;

-- Adiciona comentários às colunas
COMMENT ON COLUMN user_theme_colors.font_family IS 'Fonte principal do sistema selecionada pelo usuário';
COMMENT ON COLUMN user_theme_colors.company_logo_url IS 'URL da logo da empresa do usuário admin';