-- 2026-02-17_add_valor_total_itens_venda.sql
-- Adiciona coluna gerada `valor_total` em `itens_venda` para compatibilidade com API

ALTER TABLE IF EXISTS public.itens_venda
  ADD COLUMN IF NOT EXISTS valor_total numeric
    GENERATED ALWAYS AS (COALESCE(subtotal, preco_unitario * quantidade)) STORED;

-- Nota: coluna gerada será calculada automaticamente para linhas existentes e novas.
