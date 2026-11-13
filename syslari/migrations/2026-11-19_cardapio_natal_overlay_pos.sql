-- Cardápio Natalino: posição e tamanho da camada transparente (em % da página: {x,y,w,h}). NULL = página inteira.
ALTER TABLE public.cardapio_natal_paginas
  ADD COLUMN IF NOT EXISTS overlay_pos jsonb;

NOTIFY pgrst, 'reload schema';
