-- 090_add_status_logistica.sql
-- Adiciona colunas para controle de logística e marca ordens concluídas como aguardando
BEGIN;

ALTER TABLE public.ordens_producao
ADD COLUMN IF NOT EXISTS local_destino_id UUID REFERENCES public.locais(id);

ALTER TABLE public.ordens_producao
ADD COLUMN IF NOT EXISTS quantidade_produzida NUMERIC(10,2);

ALTER TABLE public.ordens_producao
ADD COLUMN IF NOT EXISTS status_logistica TEXT DEFAULT 'aguardando';

-- Adiciona checagem somente se a coluna existir e não há restrição com o mesmo nome
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'ordens_producao' AND c.conname = 'ordens_producao_status_logistica_check'
  ) THEN
    ALTER TABLE public.ordens_producao
    ADD CONSTRAINT ordens_producao_status_logistica_check CHECK (status_logistica IN ('aguardando','em_transito','entregue'));
  END IF;
END$$;

-- Marcar ordens já em 'concluido' como aguardando na logística (idempotente)
UPDATE public.ordens_producao
SET status_logistica = 'aguardando'
WHERE estagio_atual = 'concluido'
  AND (status_logistica IS NULL OR status_logistica NOT IN ('aguardando','em_transito','entregue'));

COMMIT;

-- Nota: após aplicar, verifique permissões/owner caso necessário no Supabase.
