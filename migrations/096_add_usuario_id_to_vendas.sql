-- 096_add_usuario_id_to_vendas.sql
-- Adiciona a coluna `usuario_id` na tabela `vendas` (uuid) e chave estrangeira opcional.

BEGIN;

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS usuario_id uuid;

-- Opcional: adicionar FK para `profiles(id)` (comentado se quiser habilitar manualmente)
-- ALTER TABLE public.vendas
--   ADD CONSTRAINT IF NOT EXISTS vendas_usuario_id_fkey
--   FOREIGN KEY (usuario_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMIT;

-- Após aplicar, execute:
-- psql "postgresql://<DB_USER>:<DB_PASS>@<DB_HOST>:5432/<DB_NAME>" -f migrations/096_add_usuario_id_to_vendas.sql
-- Se o erro persistir e a coluna já existir, reinicie o serviço PostgREST/Supabase para atualizar o schema cache.
