-- Migration: criar tabela caixa_diario e trigger para sincronizar com caixa_sessao
-- Cria a tabela caixa_diario (se ausente) e a função+trigger que garante
-- que um registro correspondente exista sempre que uma sessão for criada/atualizada.

BEGIN;

-- Criar tabela caixa_diario se não existir
CREATE TABLE IF NOT EXISTS public.caixa_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  local_id uuid,
  usuario_abertura uuid,
  organization_id uuid,
  saldo_inicial numeric,
  status text,
  data_abertura timestamptz,
  usuario_fechamento uuid,
  data_fechamento timestamptz,
  saldo_final_informado numeric,
  total_vendas_sistema numeric,
  diferenca numeric,
  observacoes text
);

-- Habilitar RLS (opcional) e criar política permissiva para usuários autenticados
ALTER TABLE IF EXISTS public.caixa_diario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated on caixa_diario" ON public.caixa_diario;
CREATE POLICY "Allow authenticated on caixa_diario" ON public.caixa_diario
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Função que sincroniza caixa_diario quando caixa_sessao é inserido/atualizado/removido
CREATE OR REPLACE FUNCTION public.sync_caixa_diario_on_caixa_sessao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Inserir apenas se não existir
    INSERT INTO public.caixa_diario (
      id, local_id, usuario_abertura, organization_id, saldo_inicial, status, data_abertura, created_at
    ) VALUES (
      NEW.id, NEW.local_id, NEW.usuario_abertura, NEW.organization_id, NEW.saldo_inicial, NEW.status, COALESCE(NEW.data_abertura, now()), now()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Atualizar campos relevantes no diário
    UPDATE public.caixa_diario
    SET
      usuario_fechamento = NEW.usuario_fechamento,
      data_fechamento = NEW.data_fechamento,
      saldo_final_informado = NEW.saldo_final_informado,
      total_vendas_sistema = NEW.total_vendas_sistema,
      diferenca = NEW.diferenca,
      observacoes = NEW.observacoes,
      status = NEW.status
    WHERE id = NEW.id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    -- Opcional: remover diário quando sessão removida
    DELETE FROM public.caixa_diario WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Criar trigger sobre caixa_sessao
DROP TRIGGER IF EXISTS trg_sync_caixa_diario ON public.caixa_sessao;
CREATE TRIGGER trg_sync_caixa_diario
AFTER INSERT OR UPDATE OR DELETE ON public.caixa_sessao
FOR EACH ROW
EXECUTE FUNCTION public.sync_caixa_diario_on_caixa_sessao();

COMMIT;
