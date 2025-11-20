-- Fix RLS policies para ordens_producao
-- Corrige políticas para permitir INSERT/UPDATE/DELETE

DO $$
BEGIN
  -- Remove políticas existentes
  DROP POLICY IF EXISTS "Acesso total para admin" ON ordens_producao;
  DROP POLICY IF EXISTS "Fábrica pode gerenciar OPs" ON ordens_producao;
  DROP POLICY IF EXISTS "PDV pode visualizar OPs" ON ordens_producao;
  DROP POLICY IF EXISTS "Admin tem acesso total" ON ordens_producao;
  DROP POLICY IF EXISTS "Fábrica pode criar OPs" ON ordens_producao;
  DROP POLICY IF EXISTS "Fábrica pode visualizar OPs" ON ordens_producao;
  DROP POLICY IF EXISTS "Fábrica pode atualizar OPs" ON ordens_producao;
  DROP POLICY IF EXISTS "Fábrica pode deletar OPs" ON ordens_producao;
  
  -- Recria políticas com permissões corretas
  
  -- Admin: acesso total
  CREATE POLICY "Admin tem acesso total"
    ON ordens_producao
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

  -- Fábrica: pode criar, visualizar e atualizar
  CREATE POLICY "Fábrica pode criar OPs"
    ON ordens_producao
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'fabrica'));

  CREATE POLICY "Fábrica pode visualizar OPs"
    ON ordens_producao
    FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'fabrica', 'pdv'));

  CREATE POLICY "Fábrica pode atualizar OPs"
    ON ordens_producao
    FOR UPDATE
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'fabrica'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'fabrica'));

  CREATE POLICY "Fábrica pode deletar OPs"
    ON ordens_producao
    FOR DELETE
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

  RAISE NOTICE 'Policies de ordens_producao atualizadas com sucesso';
END $$;
