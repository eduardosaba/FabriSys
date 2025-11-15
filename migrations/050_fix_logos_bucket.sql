-- Verificar e criar bucket 'logos' se necessário
-- Este script garante que o bucket de logos existe e está configurado corretamente

-- Criar o bucket 'logos' se não existir
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Verificar se as políticas existem e criar se necessário
do $$
begin
    -- Política de leitura
    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'Acesso público de leitura para logos'
    ) then
        create policy "Acesso público de leitura para logos"
        on storage.objects for select
        using (bucket_id = 'logos');
    end if;

    -- Política de upload
    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'Permitir upload de logos para usuários autenticados'
    ) then
        create policy "Permitir upload de logos para usuários autenticados"
        on storage.objects for insert
        with check (bucket_id = 'logos' and auth.role() = 'authenticated');
    end if;

    -- Política de atualização
    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'Permitir atualização de logos para usuários autenticados'
    ) then
        create policy "Permitir atualização de logos para usuários autenticados"
        on storage.objects for update
        using (bucket_id = 'logos' and auth.role() = 'authenticated');
    end if;

    -- Política de deleção
    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'Permitir deleção de logos para usuários autenticados'
    ) then
        create policy "Permitir deleção de logos para usuários autenticados"
        on storage.objects for delete
        using (bucket_id = 'logos' and auth.role() = 'authenticated');
    end if;
end$$;