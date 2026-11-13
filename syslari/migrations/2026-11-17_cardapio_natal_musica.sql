-- Cardápio Natalino: músicas de fundo (lista de faixas + volume)
ALTER TABLE public.cardapio_natal_config
  ADD COLUMN IF NOT EXISTS musicas jsonb NOT NULL DEFAULT '[]'::jsonb,        -- [{nome, url}]
  ADD COLUMN IF NOT EXISTS musica_volume numeric NOT NULL DEFAULT 0.35;        -- 0 a 1

NOTIFY pgrst, 'reload schema';
