-- Atualizando a estrutura da tabela fornecedores para incluir mais informações
ALTER TABLE fornecedores
  DROP COLUMN contato,
  ADD COLUMN email text,
  ADD COLUMN telefone text,
  ADD COLUMN endereco text;