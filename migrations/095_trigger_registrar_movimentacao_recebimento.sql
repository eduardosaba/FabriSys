-- 095_trigger_registrar_movimentacao_recebimento.sql
-- Garante colunas em `distribuicao_pedidos` e cria trigger
-- que registra uma linha em `movimentacao_estoque` quando uma
-- distribuição muda para status = 'recebido'. Idempotente.

BEGIN;

-- 1) Garantir colunas na tabela de distribuições
ALTER TABLE IF EXISTS public.distribuicao_pedidos
  ADD COLUMN IF NOT EXISTS quantidade_recebida numeric,
  ADD COLUMN IF NOT EXISTS observacao text,
  ADD COLUMN IF NOT EXISTS received_at timestamptz;

-- 2) Função trigger que insere em movimentacao_estoque ao receber
CREATE OR REPLACE FUNCTION public.trg_registrar_movimentacao_apos_recebimento()
RETURNS trigger AS $$
BEGIN
  -- Somente agir quando novo status for 'recebido'
  IF NEW.status = 'recebido' THEN
    -- Verifica se tabela de movimentações existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='movimentacao_estoque') THEN
      INSERT INTO public.movimentacao_estoque (
        produto_id,
        quantidade,
        tipo_movimento,
        origem,
        destino,
        referencia_id,
        created_at
      ) VALUES (
        NEW.produto_id,
        COALESCE(NEW.quantidade_recebida, NEW.quantidade_solicitada),
        'entrada',
        NEW.local_origem_id,
        NEW.local_destino_id,
        NEW.id,
        NOW()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Criar trigger (substitui se existir)
DROP TRIGGER IF EXISTS trg_registrar_movimentacao_apos_recebimento ON public.distribuicao_pedidos;
CREATE TRIGGER trg_registrar_movimentacao_apos_recebimento
AFTER UPDATE ON public.distribuicao_pedidos
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'recebido')
EXECUTE FUNCTION public.trg_registrar_movimentacao_apos_recebimento();

COMMIT;

-- Observação:
-- Após aplicar este migration no Supabase, verifique se o role do
-- executor tem permissões suficientes para executar a função (GRANT EXECUTE se necessário).
