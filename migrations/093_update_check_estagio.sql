-- 093_update_check_estagio.sql
-- Atualiza constraint check_estagio para incluir estados finais usados pelo app
BEGIN;

-- Remover constraint antiga (idempotente)
ALTER TABLE public.ordens_producao
DROP CONSTRAINT IF EXISTS check_estagio;

-- Recriar constraint com os valores usados no frontend / RPCs
ALTER TABLE public.ordens_producao
  ADD CONSTRAINT check_estagio CHECK (estagio_atual IN (
    'planejamento', 'fogao', 'descanso', 'finalizacao', 'expedicao', 'concluido', 'finalizado'
  ));

COMMIT;

-- Nota: aplique esta migration no seu banco (Supabase SQL editor ou psql).