-- Migration: Adicionar coluna tipo_fechamento na tabela remessas_cargas_pdv
ALTER TABLE public.remessas_cargas_pdv 
  ADD COLUMN IF NOT EXISTS tipo_fechamento TEXT DEFAULT 'diario';
