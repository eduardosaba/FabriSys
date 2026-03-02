-- 2026-02-27_distribuicao_pedidos_fks.sql
-- Adiciona chaves estrangeiras na tabela distribuicao_pedidos para permitir relacionamentos PostgREST

DO $$
BEGIN
  -- produto_id -> produtos_finais(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'distribuicao_pedidos' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'produto_id'
  ) THEN
    ALTER TABLE public.distribuicao_pedidos
      ADD CONSTRAINT fk_distribuicao_produto FOREIGN KEY (produto_id) REFERENCES public.produtos_finais(id) ON DELETE SET NULL;
  END IF;

  -- ordem_producao_id -> ordens_producao(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'distribuicao_pedidos' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'ordem_producao_id'
  ) THEN
    ALTER TABLE public.distribuicao_pedidos
      ADD CONSTRAINT fk_distribuicao_ordem FOREIGN KEY (ordem_producao_id) REFERENCES public.ordens_producao(id) ON DELETE SET NULL;
  END IF;

  -- local_origem_id -> locais(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'distribuicao_pedidos' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'local_origem_id'
  ) THEN
    ALTER TABLE public.distribuicao_pedidos
      ADD CONSTRAINT fk_distribuicao_local_origem FOREIGN KEY (local_origem_id) REFERENCES public.locais(id) ON DELETE SET NULL;
  END IF;

  -- local_destino_id -> locais(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'distribuicao_pedidos' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'local_destino_id'
  ) THEN
    ALTER TABLE public.distribuicao_pedidos
      ADD CONSTRAINT fk_distribuicao_local_destino FOREIGN KEY (local_destino_id) REFERENCES public.locais(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Índices auxiliares para melhorar joins
CREATE INDEX IF NOT EXISTS idx_distribuicao_produto_id ON public.distribuicao_pedidos(produto_id);
CREATE INDEX IF NOT EXISTS idx_distribuicao_local_origem ON public.distribuicao_pedidos(local_origem_id);
CREATE INDEX IF NOT EXISTS idx_distribuicao_local_destino ON public.distribuicao_pedidos(local_destino_id);

-- Observação: após aplicar essa migration, reinicie o serviço de banco Supabase (Settings -> Database -> Restart)
-- para garantir que o cache de schema do PostgREST/Realtime seja atualizado e os relacionamentos fiquem disponíveis.
