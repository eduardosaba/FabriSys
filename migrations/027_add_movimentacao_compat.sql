-- Migration: 027_add_movimentacao_compat.sql
-- Objetivo: adicionar colunas compatíveis com a API/legacy `historico_estoque`
-- e manter sincronização entre campos novos/antigos em `movimentacao_estoque`.

BEGIN;

-- 1) Adiciona colunas esperadas pelo frontend/legacy
ALTER TABLE public.movimentacao_estoque
  ADD COLUMN IF NOT EXISTS insumo_id uuid REFERENCES public.insumos(id),
  ADD COLUMN IF NOT EXISTS nf text,
  ADD COLUMN IF NOT EXISTS fornecedor text,
  ADD COLUMN IF NOT EXISTS tipo varchar(50),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 2) Backfill: preencher valores existentes a partir das colunas atuais
UPDATE public.movimentacao_estoque
SET
  tipo = COALESCE(tipo, tipo_movimento),
  nf = COALESCE(nf, observacoes),
  created_at = COALESCE(created_at, data_movimento);

-- 3) Função e trigger para manter compatibilidade em inserts/updates
CREATE OR REPLACE FUNCTION public.sync_movimentacao_estoque_compat()
RETURNS trigger AS $$
BEGIN
  -- manter cópia legada/compatível
  NEW.tipo := COALESCE(NEW.tipo, NEW.tipo_movimento);
  NEW.nf := COALESCE(NEW.nf, NEW.observacoes);
  NEW.created_at := COALESCE(NEW.created_at, NEW.data_movimento, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_movimentacao_estoque_compat ON public.movimentacao_estoque;
CREATE TRIGGER trg_sync_movimentacao_estoque_compat
  BEFORE INSERT OR UPDATE ON public.movimentacao_estoque
  FOR EACH ROW EXECUTE FUNCTION public.sync_movimentacao_estoque_compat();

-- 4) (Opcional) índice em insumo_id para consultas que filtram por insumo
CREATE INDEX IF NOT EXISTS idx_movimentacao_insumo_id ON public.movimentacao_estoque(insumo_id);

COMMIT;

-- Notas:
-- - Execute esta migration como um usuário com privilégios (administrador) no Supabase SQL Editor.
-- - Se sua aplicação depende de RLS, verifique políticas para permitir INSERT/SELECT/UPDATE conforme necessário.
-- - Após aplicar, reinicie a aplicação/dev server para garantir que o frontend passe a consumir as colunas novas.
