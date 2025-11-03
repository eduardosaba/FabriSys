-- Criar o bucket 'logos' se não existir
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Remover políticas existentes se houver
do $$
begin
    -- Remover política de leitura se existir
    if exists (
        select 1 from pg_policies 
        where schemaname = 'storage' 
        and tablename = 'objects' 
        and policyname = 'Acesso público de leitura para logos'
    ) then
        drop policy "Acesso público de leitura para logos" on storage.objects;
    end if;

    -- Remover política de upload se existir
    if exists (
        select 1 from pg_policies 
        where schemaname = 'storage' 
        and tablename = 'objects' 
        and policyname = 'Permitir upload público temporário para logos'
    ) then
        drop policy "Permitir upload público temporário para logos" on storage.objects;
    end if;

    -- Remover política de atualização se existir
    if exists (
        select 1 from pg_policies 
        where schemaname = 'storage' 
        and tablename = 'objects' 
        and policyname = 'Permitir atualização pública temporária para logos'
    ) then
        drop policy "Permitir atualização pública temporária para logos" on storage.objects;
    end if;

    -- Remover política de deleção se existir
    if exists (
        select 1 from pg_policies 
        where schemaname = 'storage' 
        and tablename = 'objects' 
        and policyname = 'Permitir deleção pública temporária para logos'
    ) then
        drop policy "Permitir deleção pública temporária para logos" on storage.objects;
    end if;
end$$;

-- Criar novas políticas
create policy "Acesso público de leitura para logos"
on storage.objects for select
using (bucket_id = 'logos');

create policy "Permitir upload público temporário para logos"
on storage.objects for insert
with check (bucket_id = 'logos');

create policy "Permitir atualização pública temporária para logos"
on storage.objects for update
using (bucket_id = 'logos');

create policy "Permitir deleção pública temporária para logos"
on storage.objects for delete
using (bucket_id = 'logos');