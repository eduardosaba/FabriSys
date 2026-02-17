-- Migration: 013_add_caixa_sessao_profiles_fks.sql
-- Adiciona chaves estrangeiras de usuario_abertura/usuario_fechamento para public.profiles(id)
-- Executar no Supabase SQL editor ou via ferramenta de migrations

DO $$
BEGIN
  -- adiciona FK usuario_abertura -> profiles(id) se ainda não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'caixa_sessao_usuario_abertura_profiles_fkey'
  ) THEN
    ALTER TABLE public.caixa_sessao
      ADD CONSTRAINT caixa_sessao_usuario_abertura_profiles_fkey
      FOREIGN KEY (usuario_abertura) REFERENCES public.profiles(id);
  END IF;

  -- adiciona FK usuario_fechamento -> profiles(id) se ainda não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'caixa_sessao_usuario_fechamento_profiles_fkey'
  ) THEN
    ALTER TABLE public.caixa_sessao
      ADD CONSTRAINT caixa_sessao_usuario_fechamento_profiles_fkey
      FOREIGN KEY (usuario_fechamento) REFERENCES public.profiles(id);
  END IF;
END
$$;

-- Opcional: conferir constraints adicionadas
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = 'caixa_sessao'::regclass AND contype = 'f';
