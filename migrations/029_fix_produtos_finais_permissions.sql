-- Permitir que usuários da fábrica também possam criar/editar produtos finais
-- Migrate up

-- Remover política antiga que só dava acesso total para admin
DROP POLICY IF EXISTS "Acesso total para admin" ON produtos_finais;

-- Criar nova política que permite admin e fábrica fazerem tudo
CREATE POLICY "Admin e fábrica têm acesso total"
  ON produtos_finais
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'fabrica'));

-- Manter as políticas de leitura existentes
-- "Fábrica pode visualizar produtos" já existe
-- "PDV pode visualizar produtos ativos" já existe