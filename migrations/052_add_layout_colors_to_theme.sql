-- Atualiza configurações de tema existentes para incluir as novas propriedades de layout
-- Executar apenas uma vez após adicionar sidebar_bg, sidebar_hover_bg e header_bg

-- Atualiza registros existentes na tabela system_settings
UPDATE system_settings
SET value = jsonb_set(
  jsonb_set(
    jsonb_set(
      value,
      '{sidebar_bg}',
      '"#ffffff"'
    ),
    '{sidebar_hover_bg}',
    '"#f3f4f6"'
  ),
  '{header_bg}',
  '"#ffffff"'
)
WHERE key = 'theme_settings'
  AND NOT (value ? 'sidebar_bg');

-- Verifica se a atualização foi bem-sucedida
SELECT
  id,
  key,
  value->>'sidebar_bg' as sidebar_bg,
  value->>'sidebar_hover_bg' as sidebar_hover_bg,
  value->>'header_bg' as header_bg,
  updated_at
FROM system_settings
WHERE key = 'theme_settings';