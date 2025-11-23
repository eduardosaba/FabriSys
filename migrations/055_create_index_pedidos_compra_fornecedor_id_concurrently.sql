-- Migration: 055_create_index_pedidos_compra_fornecedor_id_concurrently.sql
-- Objetivo: criar índice CONCURRENTLY para pedidos_compra.fornecedor_id
-- ATENÇÃO: este arquivo deve ser executado SEPARADAMENTE, fora de qualquer bloco transacional.
-- No painel SQL do Supabase, cole e execute apenas este conteúdo (não inclua BEGIN/COMMIT).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_compra_fornecedor_id ON public.pedidos_compra(fornecedor_id);

-- Observação: se o seu ambiente não permite CONCURRENTLY (por exemplo durante manutenção),
-- pode-se criar o índice normalmente sem CONCURRENTLY, mas isso pode bloquear a tabela temporariamente:
-- CREATE INDEX IF NOT EXISTS idx_pedidos_compra_fornecedor_id ON public.pedidos_compra(fornecedor_id);
