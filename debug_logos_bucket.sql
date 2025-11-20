-- Script de diagnóstico para verificar o bucket 'logos'
-- Execute este script no SQL Editor do Supabase para verificar se tudo está configurado

-- 1. Verificar se o bucket existe
select id, name, public, created_at
from storage.buckets
where id = 'logos';

-- 2. Verificar políticas do bucket
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
and tablename = 'objects'
and policyname like '%logos%';

-- 3. Verificar objetos existentes no bucket (se houver)
select name, bucket_id, created_at, updated_at, last_accessed_at
from storage.objects
where bucket_id = 'logos'
order by created_at desc
limit 10;