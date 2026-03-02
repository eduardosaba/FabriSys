-- Adiciona índice único para suportar UPSERT ON CONFLICT (ordem_producao_id, local_destino_id)
-- Criação idempotente: verifica existência e captura explicitamente o erro de objeto duplicado (42P07).
-- Não usa CONCURRENTLY porque migrations geralmente rodam dentro de transação.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'idx_distribuicao_ordem_destino_unique'
      AND n.nspname = 'public'
  ) THEN
    BEGIN
      EXECUTE 'CREATE UNIQUE INDEX idx_distribuicao_ordem_destino_unique ON public.distribuicao_pedidos (ordem_producao_id, local_destino_id) WHERE ordem_producao_id IS NOT NULL';
    EXCEPTION WHEN duplicate_object THEN
      -- Outro processo criou o índice entre a checagem e a criação; ignorar.
      RAISE NOTICE 'Índice idx_distribuicao_ordem_destino_unique já existe: %', SQLERRM;
    END;
  END IF;
END
$$;
