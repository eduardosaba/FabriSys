-- Cardápio Natalino: atualiza a tabela de páginas para a estrutura atual.
-- Necessário se a tabela foi criada pela primeira versão da migração (sem ordem/ativo e com mídia obrigatória),
-- já que CREATE TABLE IF NOT EXISTS não altera tabelas existentes. Pode ser executada mais de uma vez.

ALTER TABLE public.cardapio_natal_paginas
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS repetir boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS overlay_url text,
  ADD COLUMN IF NOT EXISTS areas jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Páginas sem mídia própria usam a imagem do PDF: a mídia deixa de ser obrigatória
ALTER TABLE public.cardapio_natal_paginas
  ALTER COLUMN midia_tipo DROP NOT NULL,
  ALTER COLUMN midia_url DROP NOT NULL;

-- Páginas novas recebem chaves 12, 13, ...: remove o limite antigo de 50 (mantém pagina >= 1)
ALTER TABLE public.cardapio_natal_paginas DROP CONSTRAINT IF EXISTS cardapio_natal_paginas_pagina_check;
ALTER TABLE public.cardapio_natal_paginas ADD CONSTRAINT cardapio_natal_paginas_pagina_check CHECK (pagina >= 1);

-- Linhas antigas ficam com a ordem do próprio número da página (senão iriam para o início do livro)
UPDATE public.cardapio_natal_paginas SET ordem = pagina WHERE ordem = 0;

NOTIFY pgrst, 'reload schema';
