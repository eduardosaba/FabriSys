-- Criar o bucket 'logos' se não existir
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Permitir acesso público de leitura aos arquivos do bucket 'logos'
create policy "Acesso público de leitura para logos" on storage.objects
  for select
  using (bucket_id = 'logos');

-- Permitir upload de arquivos para usuários autenticados no bucket 'logos'
create policy "Permitir upload de logos para usuários autenticados" on storage.objects
  for insert
  with check (
    bucket_id = 'logos' 
    and auth.role() = 'authenticated'
  );

-- Permitir atualização de arquivos para usuários autenticados no bucket 'logos'
create policy "Permitir atualização de logos para usuários autenticados" on storage.objects
  for update
  using (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
  );

-- Permitir deleção de arquivos para usuários autenticados no bucket 'logos'
create policy "Permitir deleção de logos para usuários autenticados" on storage.objects
  for delete
  using (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
  );