-- Seed mínimo para permitir inserir a ficha técnica de teste
-- Insira este SQL no editor SQL do Supabase ou rode via psql

BEGIN;

-- Produto final referenciado pelo mock
INSERT INTO produtos_finais (id, nome, descricao, preco_venda, ativo, created_at)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Produto Mock - Pão de Queijo',
  'Seed criado para teste de ficha técnica',
  25.50,
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insumo referenciado pelo mock
INSERT INTO insumos (id, nome, unidade_medida, estoque_minimo_alerta, created_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Insumo Mock 1',
  'kg',
  0,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Observação:
-- - Se sua payload usa `created_by` apontando para um usuário específico, verifique se esse
--   `auth.users.id` existe; caso contrário, remova/defina `created_by` como NULL no mock ou
--   substitua pelo id de um usuário existente.
-- - Para aplicar: cole este conteúdo no SQL Editor do Supabase e execute, ou rode no terminal:
--   psql "postgresql://<user>:<pass>@<host>:5432/<db>" -f "path/to/seed_for_ficha.sql"
