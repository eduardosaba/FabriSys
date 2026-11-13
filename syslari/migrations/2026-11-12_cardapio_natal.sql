-- Cardápio Natalino (flipbook) — produtos editáveis no admin
-- REVISAR antes de aplicar. Leitura pública (somente ativos); escrita só para admin/master.

BEGIN;

CREATE TABLE IF NOT EXISTS public.cardapio_natal_produtos (
  id text PRIMARY KEY,
  nome text NOT NULL,
  preco numeric(10,2),
  descricao text,
  mensagem_whatsapp text,
  hotspots jsonb NOT NULL DEFAULT '[]'::jsonb,
  midia_tipo text CHECK (midia_tipo IN ('imagem','gif','video')),
  midia_url text,
  poster_url text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cardapio_natal_produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cardapio_natal_select_publico" ON public.cardapio_natal_produtos;
CREATE POLICY "cardapio_natal_select_publico" ON public.cardapio_natal_produtos
  FOR SELECT TO anon, authenticated
  USING (ativo = true);

DROP POLICY IF EXISTS "cardapio_natal_select_admin" ON public.cardapio_natal_produtos;
CREATE POLICY "cardapio_natal_select_admin" ON public.cardapio_natal_produtos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master')));

DROP POLICY IF EXISTS "cardapio_natal_write_admin" ON public.cardapio_natal_produtos;
CREATE POLICY "cardapio_natal_write_admin" ON public.cardapio_natal_produtos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master')));

-- Páginas do livro: ordem, ativação e mídia própria (vídeo/GIF/imagem).
-- `pagina` é a chave estável: 1..11 = páginas do PDF; 12+ = páginas novas criadas no admin.
-- Sem midia_url numa página do PDF, o site usa a imagem original em /cardapionatal/paginas.
CREATE TABLE IF NOT EXISTS public.cardapio_natal_paginas (
  pagina integer PRIMARY KEY CHECK (pagina >= 1),
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  midia_tipo text CHECK (midia_tipo IN ('imagem','gif','video')),
  midia_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cardapio_natal_paginas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cardapio_natal_paginas_select" ON public.cardapio_natal_paginas;
CREATE POLICY "cardapio_natal_paginas_select" ON public.cardapio_natal_paginas
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "cardapio_natal_paginas_write" ON public.cardapio_natal_paginas;
CREATE POLICY "cardapio_natal_paginas_write" ON public.cardapio_natal_paginas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master')));

-- Configuração geral: vídeo de abertura, vídeo de encerramento e imagem de fundo
CREATE TABLE IF NOT EXISTS public.cardapio_natal_config (
  id text PRIMARY KEY DEFAULT 'default',
  intro_url text,
  outro_url text,
  fundo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cardapio_natal_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cardapio_natal_config_select" ON public.cardapio_natal_config;
CREATE POLICY "cardapio_natal_config_select" ON public.cardapio_natal_config
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "cardapio_natal_config_write" ON public.cardapio_natal_config;
CREATE POLICY "cardapio_natal_config_write" ON public.cardapio_natal_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master')));

-- Bucket público para imagens/vídeos/GIFs dos produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('cardapio-natal', 'cardapio-natal', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "cardapio_natal_midia_leitura" ON storage.objects;
CREATE POLICY "cardapio_natal_midia_leitura" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'cardapio-natal');

DROP POLICY IF EXISTS "cardapio_natal_midia_escrita" ON storage.objects;
CREATE POLICY "cardapio_natal_midia_escrita" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'cardapio-natal' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master')))
  WITH CHECK (bucket_id = 'cardapio-natal' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master')));

COMMIT;
