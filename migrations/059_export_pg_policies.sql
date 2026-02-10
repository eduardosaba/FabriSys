-- 059_export_pg_policies.sql
-- Exporta o estado atual das policies e constraints para diagnóstico/backup.
-- Use este script em staging/produção para capturar o estado antes de alterações.

-- 1) Exportar políticas existentes para uma tabela de backup (não sobrescreve)
CREATE TABLE IF NOT EXISTS public.backup_pg_policies_20251122 AS
SELECT
  polname,
  polcmd,
  polroles,
  polrelid::regclass AS table_name,
  pg_get_expr(polqual, polrelid) AS using_expression,
  pg_get_expr(polwithcheck, polrelid) AS with_check_expression
FROM pg_policy;

-- 2) Exportar constraints e foreign keys relevantes (pedidos_compra, fornecedores)
CREATE TABLE IF NOT EXISTS public.backup_pg_constraints_20251122 AS
SELECT
  conname,
  contype,
  conrelid::regclass AS table_from,
  confrelid::regclass AS table_to,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid::regclass::text IN ('public.pedidos_compra','public.fornecedores','public.itens_pedido_compra')
   OR confrelid::regclass::text IN ('public.pedidos_compra','public.fornecedores','public.itens_pedido_compra');

-- 3) Informação de colunas para diagnóstico de tipos
CREATE TABLE IF NOT EXISTS public.backup_columns_info_20251122 AS
SELECT table_schema, table_name, column_name, data_type, is_nullable, udt_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('pedidos_compra','fornecedores','itens_pedido_compra');

-- Notas:
-- - Esses backups são tabelas simples no banco; remova/arquive-as após revisão.
-- - Não altera políticas ativas. Use este arquivo antes de aplicar alterações RLS.
