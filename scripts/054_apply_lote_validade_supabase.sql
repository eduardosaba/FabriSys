-- Instruções para aplicar no Supabase SQL Editor
-- 1) Abra o SQL Editor do seu projeto Supabase (https://app.supabase.com/<your-project>/sql)
-- 2) Cole os comandos abaixo e execute.
-- Observação: se sua tabela for muito grande, remova a criação do índice abaixo e execute manualmente:
--   CREATE INDEX CONCURRENTLY idx_movimentacao_estoque_validade ON public.movimentacao_estoque(validade);

-- Adiciona colunas lote e validade
ALTER TABLE public.movimentacao_estoque
  ADD COLUMN IF NOT EXISTS lote text;

ALTER TABLE public.movimentacao_estoque
  ADD COLUMN IF NOT EXISTS validade date;

-- Cria índice (rápido; para grandes tabelas, execute CONCURRENTLY em sessão separada)
CREATE INDEX IF NOT EXISTS idx_movimentacao_estoque_validade ON public.movimentacao_estoque (validade);

-- Verifique se as colunas foram adicionadas:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'movimentacao_estoque' AND column_name IN ('lote','validade');

-- Se você usa triggers ou views que dependem da estrutura, verifique-as e atualize conforme necessário.

-- FIM
