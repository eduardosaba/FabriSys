-- Configurar RLS para a tabela system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Permitir leitura para todos os usuários autenticados
CREATE POLICY "Permitir leitura para usuários autenticados" ON system_settings
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Permitir escrita apenas para admins
CREATE POLICY "Permitir escrita apenas para admins" ON system_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );