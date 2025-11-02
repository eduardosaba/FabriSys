-- Políticas temporárias para desenvolvimento
-- ATENÇÃO: Usar apenas em ambiente de desenvolvimento!
-- Em produção, usar políticas baseadas em auth.role() = 'authenticated'

-- Políticas para tabela de insumos
DROP POLICY IF EXISTS "Allow all for authenticated users" ON insumos;
CREATE POLICY "Allow all access" ON insumos FOR ALL USING (true);

-- Políticas para tabela de fornecedores
DROP POLICY IF EXISTS "Allow all for authenticated users" ON fornecedores;
CREATE POLICY "Allow all access" ON fornecedores FOR ALL USING (true);

-- Políticas para tabela de lotes
DROP POLICY IF EXISTS "Allow all for authenticated users" ON lotes_insumos;
CREATE POLICY "Allow all access" ON lotes_insumos FOR ALL USING (true);

-- IMPORTANTE: Para reverter em produção, execute:
/*
DROP POLICY IF EXISTS "Allow all access" ON insumos;
DROP POLICY IF EXISTS "Allow all access" ON fornecedores;
DROP POLICY IF EXISTS "Allow all access" ON lotes_insumos;

CREATE POLICY "Allow all for authenticated users" ON insumos
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON fornecedores
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON lotes_insumos
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
*/