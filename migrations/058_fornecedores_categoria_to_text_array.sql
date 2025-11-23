-- Migration: 058_fornecedores_categoria_to_text_array.sql
-- Objetivo: Converter a coluna `categoria` da tabela `fornecedores` para o tipo `text[]`.
-- Esta migration é idempotente: pode ser executada múltiplas vezes sem dano.

BEGIN;

-- 1) Se a coluna não existe, criá-la já como text[] com valor default
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fornecedores' AND column_name = 'categoria'
  ) THEN
    ALTER TABLE public.fornecedores
      ADD COLUMN categoria text[] DEFAULT ARRAY['Outros'];
  ELSE
    -- 2) Se a coluna existe mas não é text[], converte CSV -> array
    IF NOT EXISTS (
      SELECT 1
      FROM pg_attribute a
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_type t ON a.atttypid = t.oid
      WHERE c.relname = 'fornecedores' AND a.attname = 'categoria' AND t.typname = 'text[]'
    ) THEN
      ALTER TABLE public.fornecedores
        ALTER COLUMN categoria TYPE text[] USING (
          CASE
            WHEN categoria IS NULL OR categoria = '' THEN ARRAY['Outros']
            ELSE string_to_array(categoria, ',')
          END
        );
    END IF;
  END IF;
END
$$;

-- 3) Criar índice GIN para consultas por categoria (se ainda não existir)
CREATE INDEX IF NOT EXISTS idx_fornecedores_categoria_gin ON public.fornecedores USING gin (categoria);

COMMIT;

-- Notas:
-- - Esta migration tenta manter compatibilidade com dados legados que armazenavam
--   categorias como CSV em uma coluna text. Após a alteração, a coluna passa a ser text[].
-- - Recomenda-se executar primeiro em staging e validar a UI e buscas por categoria.
-- - Se você tiver triggers, policies ou views dependentes da coluna `categoria`, revise-os.
