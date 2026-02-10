-- Adiciona coluna company_logo_scale à tabela user_theme_colors
-- Permite controlar a escala da logo da empresa independentemente da logo do sistema

-- Adiciona a coluna company_logo_scale se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_theme_colors'
    AND column_name = 'company_logo_scale'
  ) THEN
    ALTER TABLE user_theme_colors
    ADD COLUMN company_logo_scale numeric(3,2) DEFAULT 1.0;
  END IF;
END $$;

-- Atualiza registros existentes com valor padrão
UPDATE user_theme_colors
SET company_logo_scale = 1.0
WHERE company_logo_scale IS NULL;

-- Adiciona comentário à coluna
COMMENT ON COLUMN user_theme_colors.company_logo_scale IS 'Escala da logo da empresa (0.1 a 5.0, padrão 1.0)';

-- Recria as políticas RLS se necessário (mantém consistência)
DROP POLICY IF EXISTS "Users can view own theme colors" ON user_theme_colors;
DROP POLICY IF EXISTS "Users can insert own theme colors" ON user_theme_colors;
DROP POLICY IF EXISTS "Users can update own theme colors" ON user_theme_colors;

CREATE POLICY "Users can view own theme colors" ON user_theme_colors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own theme colors" ON user_theme_colors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own theme colors" ON user_theme_colors
  FOR UPDATE USING (auth.uid() = user_id);