-- Migration: Corrige ordens_producao com local_destino_id NULL
-- Data: 2026-02-25
-- Instruções: execute este script no editor SQL do Supabase ou via psql conectado ao banco.
-- Este comando define o destino padrão para a primeira loja do tipo 'fabrica'.
BEGIN;

-- Visualizar quantas ordens seriam afetadas
SELECT count(*) AS ordens_sem_local
FROM public.ordens_producao
WHERE local_destino_id IS NULL;

-- Atualizar ordens sem local_destino_id para a primeira local do tipo 'fabrica'
UPDATE public.ordens_producao
SET local_destino_id = (
  SELECT id FROM public.locais WHERE tipo = 'fabrica' AND organization_id = ordens_producao.organization_id LIMIT 1
)
WHERE local_destino_id IS NULL;

-- Verificar resultado
SELECT count(*) AS ordens_sem_local_depois
FROM public.ordens_producao
WHERE local_destino_id IS NULL;

COMMIT;

-- Observação: o UPDATE escolhe a primeira `local` do tipo 'fabrica' por organização.
-- Se preferir atualizar apenas para uma organização específica, adicione:
--   AND organization_id = '<ORGANIZATION_ID>'
-- na cláusula WHERE do SELECT interno.
