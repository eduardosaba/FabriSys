-- Cardápio Natalino: loop do vídeo da página, camada transparente por cima e áreas animadas
ALTER TABLE public.cardapio_natal_paginas
  ADD COLUMN IF NOT EXISTS repetir boolean NOT NULL DEFAULT true,   -- vídeo da página em loop
  ADD COLUMN IF NOT EXISTS overlay_url text,                        -- PNG/WebP transparente por cima da mídia
  ADD COLUMN IF NOT EXISTS areas jsonb NOT NULL DEFAULT '[]'::jsonb; -- [{x,y,w,h,tipo,url,repetir}] em % da página
