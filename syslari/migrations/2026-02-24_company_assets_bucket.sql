-- Migration: 2026-02-24_company_assets_bucket.sql
-- Torna o bucket company_assets público para leitura e adiciona policy de escrita
BEGIN;

-- 1) Torna o bucket público para leitura direta
UPDATE storage.buckets
SET public = true
WHERE id = 'company_assets';

-- 2) Política para permitir que apenas Admins/Master gerenciem objects no bucket
-- Nota: storage.objects é uma tabela do Postgres no schema storage
DROP POLICY IF EXISTS "Admins podem gerenciar assets da empresa" ON storage.objects;
CREATE POLICY "Admins podem gerenciar assets da empresa"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'company_assets' AND 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','master')
    )
  )
  WITH CHECK (
    bucket_id = 'company_assets' AND 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','master')
    )
  );

-- 3) Garantir colunas de escala e cor na tabela de configurações (compatibilidade)
ALTER TABLE public.configuracoes_sistema 
  ADD COLUMN IF NOT EXISTS logo_scale NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#88544c';

COMMIT;

-- Execute esta migration no Supabase SQL Editor com usuário administrador.
