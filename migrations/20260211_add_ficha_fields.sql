-- Migration: Adiciona campo 'observacao' e suporte a insumo composto nas fichas técnicas
-- e adiciona campo 'tipo' em produtos_finais.

BEGIN;

-- 1) Adicionar coluna 'observacao' em fichas_tecnicas (texto, opcional)
ALTER TABLE IF EXISTS fichas_tecnicas
  ADD COLUMN IF NOT EXISTS observacao TEXT;

-- 2) Adicionar coluna para referenciar produto composto quando o insumo for uma preparação
ALTER TABLE IF EXISTS fichas_tecnicas
  ADD COLUMN IF NOT EXISTS insumo_composto_produto_id uuid NULL;

-- criar FK (se a tabela produtos_finais existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'produtos_finais') THEN
    -- Verifica se a constraint já existe antes de criar
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_fichas_insumo_composto_produto'
    ) THEN
      EXECUTE '
        ALTER TABLE IF EXISTS fichas_tecnicas
        ADD CONSTRAINT fk_fichas_insumo_composto_produto
        FOREIGN KEY (insumo_composto_produto_id) REFERENCES produtos_finais(id) ON DELETE SET NULL
      ';
    END IF;
  END IF;
END
$$;

-- 3) Adicionar coluna 'tipo' em produtos_finais para diferenciar 'final' vs 'semi_acabado'
ALTER TABLE IF EXISTS produtos_finais
  ADD COLUMN IF NOT EXISTS tipo varchar(32) DEFAULT 'final' NOT NULL;

-- Opcional: atualizar linhas existentes para 'final' (definido pelo default acima)
-- Mas executar um UPDATE para garantir
UPDATE produtos_finais SET tipo = 'final' WHERE tipo IS NULL;

COMMIT;

-- Observações:
-- - Após aplicar essa migration, o backend/API deve ser atualizado para aceitar
--   a propriedade `observacao` no payload de criação de fichas (p.ex. gravar
--   o mesmo texto em cada linha de ficha técnica criada, ou numa tabela de
--   cabeçalho se for o caso).
-- - A coluna `insumo_composto_produto_id` permite armazenar referência a um
--   `produto_final` quando o insumo for uma preparação (massa). A aplicação
--   pode inserir `insumo_id = NULL` e preencher essa coluna.
