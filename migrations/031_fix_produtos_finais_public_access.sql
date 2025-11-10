-- Permitir leitura pública de produtos finais para desenvolvimento
-- Isso pode ser removido em produção se necessário

CREATE POLICY "Leitura pública de produtos finais"
  ON produtos_finais
  FOR SELECT
  TO authenticated
  USING (true);

-- Também permitir que usuários autenticados possam criar produtos
CREATE POLICY "Usuários autenticados podem criar produtos"
  ON produtos_finais
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permitir atualização para usuários autenticados
CREATE POLICY "Usuários autenticados podem atualizar produtos"
  ON produtos_finais
  FOR UPDATE
  TO authenticated
  USING (true);

-- Permitir deleção para usuários autenticados
CREATE POLICY "Usuários autenticados podem deletar produtos"
  ON produtos_finais
  FOR DELETE
  TO authenticated
  USING (true);