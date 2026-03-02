-- 2026-02-27_distribuicao_pedidos_prepare_and_trigger.sql
-- Prepara a tabela distribuicao_pedidos para o novo fluxo (planejado -> pendente -> enviado -> recebido)
-- e cria um trigger que libera as linhas de distribuicao quando a ordem_producao for marcada como finalizada.

-- 1) Ajusta a constraint de status para aceitar os novos estados
ALTER TABLE IF EXISTS public.distribuicao_pedidos
  DROP CONSTRAINT IF EXISTS distribuicao_pedidos_status_check;

ALTER TABLE IF EXISTS public.distribuicao_pedidos
  ADD CONSTRAINT distribuicao_pedidos_status_check
  CHECK (status IN (
    'planejado',
    'pendente',
    'enviado',
    'recebido',
    'cancelado'
  ));

-- 2) Garante que quantidade_solicitada aceite decimais (ex.: kg)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'distribuicao_pedidos' AND column_name = 'quantidade_solicitada'
  ) THEN
    ALTER TABLE public.distribuicao_pedidos
      ALTER COLUMN quantidade_solicitada TYPE numeric(10,3) USING quantidade_solicitada::numeric;
  END IF;
END$$;

-- 3) Índice para melhorar buscas por ordem_producao
CREATE INDEX IF NOT EXISTS idx_distribuicao_op_id ON public.distribuicao_pedidos(ordem_producao_id);

-- 4) Função trigger: quando uma ordem_producao for marcada como finalizada,
-- libera as linhas filhas em distribuicao_pedidos que estavam em 'planejado'
CREATE OR REPLACE FUNCTION public.fn_liberar_distribuicao_apos_producao()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'finalizada' AND (OLD.status IS DISTINCT FROM 'finalizada')) THEN
    UPDATE public.distribuicao_pedidos
    SET status = 'pendente', updated_at = NOW()
    WHERE ordem_producao_id = NEW.id
      AND status = 'planejado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Cria o trigger que chama a função após UPDATE em ordens_producao
DROP TRIGGER IF EXISTS trg_liberar_distribuicao ON public.ordens_producao;

CREATE TRIGGER trg_liberar_distribuicao
AFTER UPDATE ON public.ordens_producao
FOR EACH ROW
EXECUTE FUNCTION public.fn_liberar_distribuicao_apos_producao();

-- Fim da migration
