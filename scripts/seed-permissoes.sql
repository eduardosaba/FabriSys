-- Seed padrão para permissões de acesso
-- Execute este SQL no Supabase SQL Editor ou via psql conectado ao banco.

INSERT INTO configuracoes_sistema (chave, valor, descricao)
VALUES (
  'permissoes_acesso',
  '{"master":["all"],"admin":["all"],"gerente":[],"compras":[],"fabrica":[],"pdv":["pdv","relatorios"]}',
  'Permissões iniciais do sistema (seed)'
)
ON CONFLICT (chave)
DO UPDATE SET valor = EXCLUDED.valor;
