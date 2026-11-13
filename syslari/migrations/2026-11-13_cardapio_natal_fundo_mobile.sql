-- Cardápio Natalino: fundo próprio para celular e imagem de prévia do link
ALTER TABLE public.cardapio_natal_config
  ADD COLUMN IF NOT EXISTS fundo_mobile_url text,
  ADD COLUMN IF NOT EXISTS og_image_url text; -- imagem de prévia ao compartilhar o link
