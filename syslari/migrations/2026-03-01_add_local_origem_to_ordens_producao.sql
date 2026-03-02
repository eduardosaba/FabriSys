-- Adiciona colunas de local de origem/destino em ordens_producao quando ausentes
-- Torna a aplicação resiliente quando a coluna não existir no schema atual

ALTER TABLE IF EXISTS public.ordens_producao
  ADD COLUMN IF NOT EXISTS local_origem_id uuid;

ALTER TABLE IF EXISTS public.ordens_producao
  ADD COLUMN IF NOT EXISTS local_destino_id uuid;

-- Tenta popular local_origem_id para registros existentes usando o local fábrica da organization
UPDATE public.ordens_producao op
SET local_origem_id = (
  SELECT id FROM public.locais l WHERE l.tipo = 'fabrica' AND l.organization_id = op.organization_id LIMIT 1
)
WHERE local_origem_id IS NULL;

-- Se desejar adicionar FK posteriormente, avalie consistência e crie constraint separadamente.
