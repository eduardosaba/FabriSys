-- Script de correção para o bucket 'logos'
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Criar o bucket 'logos' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Acesso público de leitura para logos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload público temporário para logos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização pública temporária para logos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir deleção pública temporária para logos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload de logos para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização de logos para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir deleção de logos para usuários autenticados" ON storage.objects;

-- 3. Criar novas políticas corretas
CREATE POLICY "Acesso público de leitura para logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Permitir upload de logos para usuários autenticados"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir atualização de logos para usuários autenticados"
ON storage.objects FOR UPDATE
USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir deleção de logos para usuários autenticados"
ON storage.objects FOR DELETE
USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- 4. Verificar se tudo foi criado corretamente
SELECT 'Bucket criado/verificado com sucesso!' as status;