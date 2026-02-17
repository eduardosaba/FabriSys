-- 104_add_localid_to_estoque_produtos.sql
-- Adiciona suporte a estoque por local (local_id) em estoque_produtos

BEGIN;

-- Adiciona coluna local_id (nullable) para compatibilidade retroativa
ALTER TABLE IF EXISTS public.estoque_produtos
  ADD COLUMN IF NOT EXISTS local_id uuid;

-- Adiciona foreign key para locais se a tabela existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='locais') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage
      WHERE table_name='estoque_produtos' AND column_name='local_id'
    ) THEN
      BEGIN
        -- adiciona constraint apenas se possível (não falha se o fk já existir)
        ALTER TABLE public.estoque_produtos
          ADD CONSTRAINT estoque_produtos_local_fk FOREIGN KEY (local_id) REFERENCES public.locais(id);
      EXCEPTION WHEN duplicate_object THEN
        -- ignore
      END;
    END IF;
  END IF;
END$$;

-- Índice único parcial por (local_id, produto_id) quando local_id não for nulo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'estoque_produtos' AND indexname = 'estoque_produtos_local_produto_idx'
  ) THEN
    CREATE UNIQUE INDEX estoque_produtos_local_produto_idx ON public.estoque_produtos (local_id, produto_id) WHERE local_id IS NOT NULL;
  END IF;
END$$;

COMMIT;

-- Observação: após aplicar, atualize as funções RPC (p.ex. finalizar_op_kanban e enviar_carga_loja)
-- para usar a coluna `local_id` ao inserir/atualizar linhas no estoque.
