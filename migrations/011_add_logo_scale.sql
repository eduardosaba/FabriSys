-- Adiciona campo logo_scale à tabela system_settings para controlar a escala do logo
DO $$
DECLARE
  current_settings jsonb;
  updated_settings jsonb;
BEGIN
  -- Pega as configurações atuais
  SELECT value FROM public.system_settings WHERE key = 'theme_settings' INTO current_settings;
  
  -- Adiciona o campo logo_scale se não existir
  IF NOT current_settings ? 'logo_scale' THEN
    updated_settings = current_settings || '{"logo_scale": 1.0}'::jsonb;
    
    -- Atualiza as configurações
    UPDATE public.system_settings
    SET value = updated_settings
    WHERE key = 'theme_settings';
  END IF;
END $$;