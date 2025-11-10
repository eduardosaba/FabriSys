-- Migration 035: Corrige políticas RLS da tabela fichas_tecnicas
-- Permite INSERT, UPDATE, DELETE para admin e fabrica
-- Data: 2025-11-06

-- Remove todas as políticas existentes
DROP POLICY IF EXISTS "Admin tem acesso total" ON fichas_tecnicas;
DROP POLICY IF EXISTS "Fábrica pode visualizar fichas técnicas ativas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "admin_all_fichas_tecnicas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "fabrica_all_fichas_tecnicas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "fabrica_select_fichas_tecnicas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "fabrica_insert_fichas_tecnicas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "fabrica_update_fichas_tecnicas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "fabrica_delete_fichas_tecnicas" ON fichas_tecnicas;

-- Política para Admin (acesso total)
CREATE POLICY "admin_all_fichas_tecnicas"
  ON fichas_tecnicas
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
  );

-- Política SELECT para Fábrica
CREATE POLICY "fabrica_select_fichas_tecnicas"
  ON fichas_tecnicas
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'fabrica')
  );

-- Política INSERT para Fábrica
CREATE POLICY "fabrica_insert_fichas_tecnicas"
  ON fichas_tecnicas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'fabrica')
  );

-- Política UPDATE para Fábrica
CREATE POLICY "fabrica_update_fichas_tecnicas"
  ON fichas_tecnicas
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'fabrica')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'fabrica')
  );

-- Política DELETE para Fábrica
CREATE POLICY "fabrica_delete_fichas_tecnicas"
  ON fichas_tecnicas
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'fabrica')
  );
