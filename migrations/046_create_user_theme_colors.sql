-- Cria tabela para armazenar cores customizadas e configurações de logo por usuário admin
CREATE TABLE IF NOT EXISTS user_theme_colors (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_mode text NOT NULL DEFAULT 'light' CHECK (theme_mode IN ('light', 'dark')),
  primary_color text NOT NULL DEFAULT '#4CAF50',
  titulo_paginas_color text NOT NULL DEFAULT '#ffffff',
  logo_url text DEFAULT '/logo.png',
  logo_scale numeric(3,2) DEFAULT 1.0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, theme_mode)
);

-- Habilita RLS
ALTER TABLE user_theme_colors ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários podem ver suas próprias cores"
  ON user_theme_colors
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias cores"
  ON user_theme_colors
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias cores"
  ON user_theme_colors
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias cores"
  ON user_theme_colors
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_user_theme_colors_user_id ON user_theme_colors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_theme_colors_mode ON user_theme_colors(theme_mode);

-- Insere cores padrão para usuários admin existentes
INSERT INTO user_theme_colors (user_id, theme_mode, primary_color, titulo_paginas_color, logo_url, logo_scale)
SELECT
  p.id,
  'light'::text,
  '#4CAF50'::text,
  '#ffffff'::text,
  '/logo.png'::text,
  1.0::numeric
FROM profiles p
WHERE p.role IN ('admin', 'master')
ON CONFLICT (user_id, theme_mode) DO NOTHING;

INSERT INTO user_theme_colors (user_id, theme_mode, primary_color, titulo_paginas_color, logo_url, logo_scale)
SELECT
  p.id,
  'dark'::text,
  '#3b82f6'::text,
  '#f3f4f6'::text,
  '/logo.png'::text,
  1.0::numeric
FROM profiles p
WHERE p.role IN ('admin', 'master')
ON CONFLICT (user_id, theme_mode) DO NOTHING;