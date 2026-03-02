-- 1. Removemos a regra antiga
ALTER TABLE ordens_producao 
DROP CONSTRAINT IF EXISTS ordens_producao_status_logistica_check;

-- 2. Criamos a nova regra com os status corretos
ALTER TABLE ordens_producao 
ADD CONSTRAINT ordens_producao_status_logistica_check 
CHECK (status_logistica IN (
  'planejado',            -- Criado no planejamento
  'aguardando_expedicao', -- Pronto na fábrica
  'em_transito',          -- Saiu para entrega
  'entregue',             -- Recebido no PDV
  'cancelado',
  'pendente'              -- Adicionado para compatibilidade
));

-- 3. Define 'planejado' como padrão
ALTER TABLE ordens_producao 
ALTER COLUMN status_logistica SET DEFAULT 'planejado';

-- Obs: execute este script no SQL Editor do seu banco (psql, pgAdmin ou Supabase SQL)
-- Não requer UUIDs manualmente.
