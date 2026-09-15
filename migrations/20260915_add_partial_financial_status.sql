-- Migration: Expandir constraint de status para suportar fechamento financeiro parcial
-- Novos status: 'sobras_informadas' (sobras registradas, aguardando $), 'dinheiro_informado' (dinheiro na gaveta, Pix/Cartão pendente)

ALTER TABLE public.remessas_cargas_pdv 
  DROP CONSTRAINT IF EXISTS remessas_cargas_pdv_status_check;

ALTER TABLE public.remessas_cargas_pdv 
  ADD CONSTRAINT remessas_cargas_pdv_status_check 
  CHECK (status IN (
    'aberto', 
    'sobras_informadas', 
    'dinheiro_informado', 
    'encerrado', 
    'auditado', 
    'conferido'
  ));
