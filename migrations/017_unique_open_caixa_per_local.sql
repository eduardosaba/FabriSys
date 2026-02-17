-- Migration: 017_unique_open_caixa_per_local.sql
-- Garante que exista no máximo 1 caixa com status='aberto' por local_id
-- Faz backup, remove duplicatas (mantém a mais antiga aberta) e cria índice único parcial

BEGIN;

-- Backup rápido
CREATE TABLE IF NOT EXISTS backup_caixa_sessao AS TABLE public.caixa_sessao WITH DATA;

-- Remove duplicatas mantendo a mais antiga (por data_abertura ou created_at)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
          PARTITION BY local_id
          ORDER BY coalesce(
            -- data_abertura preferido, fallback para created_at se existir, senão now()
            data_abertura,
            (CASE WHEN EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'caixa_sessao' AND column_name = 'created_at'
             ) THEN created_at ELSE NULL END),
            now()
          ) ASC
         ) AS rn
  FROM public.caixa_sessao
  WHERE status = 'aberto'
)
DELETE FROM public.caixa_sessao
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Cria índice único parcial evitando que múltiplos caixas abertos existam para o mesmo local
CREATE UNIQUE INDEX IF NOT EXISTS uq_caixa_sessao_local_open
  ON public.caixa_sessao (local_id)
  WHERE (status = 'aberto');

COMMIT;

-- Verificação sugerida:
-- SELECT local_id, count(*) FROM public.caixa_sessao WHERE status = 'aberto' GROUP BY local_id HAVING count(*) > 1;
