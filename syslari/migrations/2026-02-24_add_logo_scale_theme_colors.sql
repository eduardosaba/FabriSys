-- Migration: 2026-02-24_add_logo_scale_theme_colors.sql
-- Adiciona colunas para logo_scale e theme_colors em configuracoes_sistema
BEGIN;

ALTER TABLE IF EXISTS public.configuracoes_sistema
  ADD COLUMN IF NOT EXISTS logo_scale numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS theme_colors jsonb DEFAULT ('{"primary":"#88544c","secondary":"#ffffff"}')::jsonb;

-- Política: apenas admins ou master podem alterar entradas (UPDATE/INSERT/DELETE)
DROP POLICY IF EXISTS "Apenas admins alteram configuracoes" ON public.configuracoes_sistema;
CREATE POLICY "Apenas admins alteram configuracoes"
  ON public.configuracoes_sistema
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'master' OR profiles.role = 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'master' OR profiles.role = 'admin')
    )
  );

COMMIT;

-- Nota: execute esta migration no Supabase SQL Editor como usuário com privilégios apropriados.
