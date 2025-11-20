-- Migração condicional para corrigir políticas duplicadas na tabela user_theme_colors
-- Esta migração só executa se as políticas não existirem

DO $$
BEGIN
    -- Verifica se a tabela existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_theme_colors') THEN
        RAISE EXCEPTION 'Tabela user_theme_colors não existe. Execute primeiro a migração 046_create_user_theme_colors.sql';
    END IF;

    -- Remove políticas duplicadas se existirem
    DROP POLICY IF EXISTS "Usuários podem ver suas próprias cores" ON user_theme_colors;
    DROP POLICY IF EXISTS "Usuários podem inserir suas próprias cores" ON user_theme_colors;
    DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias cores" ON user_theme_colors;
    DROP POLICY IF EXISTS "Usuários podem deletar suas próprias cores" ON user_theme_colors;

    -- Recria as políticas
    CREATE POLICY "Usuários podem ver suas próprias cores"
      ON user_theme_colors
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    CREATE POLICY "Usuários podem inserir suas próprias cores"
      ON user_theme_colors
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Usuários podem atualizar suas próprias cores"
      ON user_theme_colors
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);

    CREATE POLICY "Usuários podem deletar suas próprias cores"
      ON user_theme_colors
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);

    RAISE NOTICE 'Políticas da tabela user_theme_colors recriadas com sucesso';
END $$;