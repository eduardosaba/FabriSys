-- Migration: Atualizar a restrição CHECK de status em remessas_cargas_pdv
-- Permite os status: 'aberto', 'encerrado', 'auditado', 'conferido'

ALTER TABLE public.remessas_cargas_pdv 
  DROP CONSTRAINT IF EXISTS remessas_cargas_pdv_status_check;

ALTER TABLE public.remessas_cargas_pdv 
  ADD CONSTRAINT remessas_cargas_pdv_status_check 
  CHECK (status IN ('aberto', 'encerrado', 'auditado', 'conferido'));
