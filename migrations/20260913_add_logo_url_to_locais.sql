-- Migration: Adicionar coluna logo_url na tabela de locais/PDVs
ALTER TABLE public.locais 
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
