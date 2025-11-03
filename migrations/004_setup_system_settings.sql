-- Cria a tabela system_settings se não existir
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by uuid REFERENCES auth.users(id)
);

-- Habilita RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar configurações" ON system_settings;
CREATE POLICY "Usuários autenticados podem visualizar configurações"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem editar configurações" ON system_settings;
CREATE POLICY "Usuários autenticados podem editar configurações"
  ON system_settings FOR ALL
  TO authenticated
  USING (true);

-- Insere o tema padrão
INSERT INTO system_settings (key, value)
VALUES (
  'theme',
  '{
    "name": "SysLari",
    "logo_url": "/logo.png",
    "primary_color": "#2563eb",
    "secondary_color": "#4f46e5",
    "accent_color": "#f97316",
    "background_color": "#ffffff",
    "text_color": "#111827",
    "font_family": "Geist",
    "border_radius": "0.5rem",
    "theme_mode": "system",
    "sidebar_color": "#ffffff",
    "density": "comfortable"
  }'::jsonb
)
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value;