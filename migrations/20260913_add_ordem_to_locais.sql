-- Migration para adicionar a coluna 'ordem' no cadastro de locais / PDVs
ALTER TABLE public.locais 
ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;
