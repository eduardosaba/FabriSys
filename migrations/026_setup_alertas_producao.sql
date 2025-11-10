-- Criar tipos enum se não existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_alerta') THEN
    CREATE TYPE tipo_alerta AS ENUM ('atraso', 'qualidade', 'estoque', 'eficiencia');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severidade_alerta') THEN
    CREATE TYPE severidade_alerta AS ENUM ('baixa', 'media', 'alta');
  END IF;
END $$;

-- Criar tabela de movimentação de estoque se não existir
CREATE TABLE IF NOT EXISTS public.movimentacao_estoque (
  id uuid primary key default gen_random_uuid(),
  tipo_movimento varchar(50) not null,
  quantidade numeric not null,
  produto_id uuid references public.produtos_finais(id),
  ordem_producao_id uuid references public.ordens_producao(id),
  created_by uuid references auth.users(id),
  observacoes text,
  data_movimento timestamptz not null default now()
);

-- Criar tabela de alertas de produção se não existir
CREATE TABLE IF NOT EXISTS public.alertas_producao (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_alerta not null,
  severidade severidade_alerta not null,
  mensagem text not null,
  ordem_producao_id uuid references public.ordens_producao(id),
  data_criacao timestamptz not null default now(),
  resolvido boolean not null default false
);

-- Permissões RLS para movimentacao_estoque
ALTER TABLE public.movimentacao_estoque ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários autenticados podem ver movimentações" ON public.movimentacao_estoque;
CREATE POLICY "Usuários autenticados podem ver movimentações"
  ON public.movimentacao_estoque FOR SELECT
  USING (auth.jwt() ->> 'role' IS NOT NULL);

DROP POLICY IF EXISTS "Usuários autenticados podem criar movimentações" ON public.movimentacao_estoque;
CREATE POLICY "Usuários autenticados podem criar movimentações"
  ON public.movimentacao_estoque FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IS NOT NULL);

-- Permissões RLS para alertas_producao
ALTER TABLE public.alertas_producao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários autenticados podem ver alertas" ON public.alertas_producao;
CREATE POLICY "Usuários autenticados podem ver alertas"
  ON public.alertas_producao FOR SELECT
  USING (auth.jwt() ->> 'role' IS NOT NULL);

DROP POLICY IF EXISTS "Usuários autenticados podem resolver alertas" ON public.alertas_producao;
CREATE POLICY "Usuários autenticados podem resolver alertas"
  ON public.alertas_producao FOR UPDATE
  USING (auth.jwt() ->> 'role' IS NOT NULL)
  WITH CHECK (auth.jwt() ->> 'role' IS NOT NULL);

-- Função para verificar atrasos na produção
CREATE OR REPLACE FUNCTION verificar_atrasos_producao()
RETURNS TRIGGER AS $$
DECLARE
  ordem public.ordens_producao;
  tempo_limite interval;
BEGIN
  -- Busca a ordem de produção sendo atualizada
  SELECT * INTO ordem FROM public.ordens_producao WHERE id = NEW.id;

  -- Define tempo limite baseado no produto (simplificado - 24 horas)
  tempo_limite := interval '24 hours';

  -- Se o tempo real excedeu o limite, cria alerta
  IF (ordem.data_inicio IS NOT NULL AND ordem.data_fim IS NULL) THEN
    IF (NOW() - ordem.data_inicio > tempo_limite) THEN
      INSERT INTO public.alertas_producao (
        tipo,
        severidade,
        mensagem,
        ordem_producao_id
      ) VALUES (
        'atraso',
        'alta',
        FORMAT('Ordem de produção #%s está atrasada em relação ao tempo estimado', ordem.numero_op),
        ordem.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para verificar atrasos
DROP TRIGGER IF EXISTS verificar_atrasos_producao_trigger ON public.ordens_producao;
CREATE TRIGGER verificar_atrasos_producao_trigger
  AFTER UPDATE ON public.ordens_producao
  FOR EACH ROW
  EXECUTE FUNCTION verificar_atrasos_producao();

-- Função para verificar estoque crítico
CREATE OR REPLACE FUNCTION verificar_estoque_critico()
RETURNS TRIGGER AS $$
DECLARE
  estoque_atual numeric;
  estoque_minimo numeric;
BEGIN
  -- Busca estoque mínimo do produto (simplificado - assume 10 como mínimo)
  estoque_minimo := 10;

  -- Calcula estoque atual após movimento
  SELECT COALESCE(SUM(
    CASE
      WHEN tipo_movimento = 'entrada' THEN quantidade
      ELSE -quantidade
    END
  ), 0) INTO estoque_atual
  FROM public.movimentacao_estoque
  WHERE produto_id = NEW.produto_id;

  -- Se estoque está abaixo do mínimo, cria alerta
  IF (estoque_atual <= estoque_minimo) THEN
    INSERT INTO public.alertas_producao (
      tipo,
      severidade,
      mensagem
    ) VALUES (
      'estoque',
      'alta',
      FORMAT('Estoque do produto %s está abaixo do mínimo (Atual: %s, Mínimo: %s)',
        (SELECT nome FROM public.produtos_finais WHERE id = NEW.produto_id),
        estoque_atual,
        estoque_minimo
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para verificar estoque
DROP TRIGGER IF EXISTS verificar_estoque_critico_trigger ON public.movimentacao_estoque;
CREATE TRIGGER verificar_estoque_critico_trigger
  AFTER INSERT OR UPDATE ON public.movimentacao_estoque
  FOR EACH ROW
  EXECUTE FUNCTION verificar_estoque_critico();