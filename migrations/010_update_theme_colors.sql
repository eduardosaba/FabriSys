-- Atualiza a estrutura de cores para suportar temas claro e escuro
DO $$ 
BEGIN
  -- Verificar se as colunas antigas existem
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'system_settings' 
    AND column_name IN ('primary_color', 'secondary_color', 'accent_color', 'background_color', 'text_color')
  ) THEN
    -- Adicionar a nova coluna colors
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS colors jsonb;

    -- Migrar dados existentes para o novo formato
    UPDATE system_settings
    SET colors = jsonb_build_object(
      'light', jsonb_build_object(
        'primary', primary_color,
        'secondary', secondary_color,
        'accent', accent_color,
        'background', background_color,
        'text', text_color
      ),
      'dark', jsonb_build_object(
        'primary', primary_color,
        'secondary', secondary_color,
        'accent', accent_color,
        'background', background_color,
        'text', text_color
      )
    )
    WHERE primary_color IS NOT NULL
      OR secondary_color IS NOT NULL
      OR accent_color IS NOT NULL
      OR background_color IS NOT NULL
      OR text_color IS NOT NULL;

    -- Remover colunas antigas
    ALTER TABLE system_settings
    DROP COLUMN IF EXISTS primary_color,
    DROP COLUMN IF EXISTS secondary_color,
    DROP COLUMN IF EXISTS accent_color,
    DROP COLUMN IF EXISTS background_color,
    DROP COLUMN IF EXISTS text_color;
  ELSE
    -- Se as colunas antigas não existem, adicionar a nova coluna colors com valores padrão
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS colors jsonb DEFAULT jsonb_build_object(
      'light', jsonb_build_object(
        'primary', '#0066cc',
        'secondary', '#4d4d4d',
        'accent', '#00cc66',
        'background', '#ffffff',
        'text', '#1a1a1a'
      ),
      'dark', jsonb_build_object(
        'primary', '#3399ff',
        'secondary', '#666666',
        'accent', '#00ff80',
        'background', '#1a1a1a',
        'text', '#ffffff'
      )
    );
  END IF;
END $$;