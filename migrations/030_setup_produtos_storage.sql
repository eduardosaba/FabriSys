-- Criar o bucket 'produtos' se não existir
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

-- Permitir acesso público de leitura aos arquivos do bucket 'produtos'
create policy "Acesso público de leitura para produtos" on storage.objects
  for select
  using (bucket_id = 'produtos');

-- Permitir upload de arquivos para usuários autenticados no bucket 'produtos'
create policy "Permitir upload de produtos para usuários autenticados" on storage.objects
  for insert
  with check (
    bucket_id = 'produtos'
    and auth.role() = 'authenticated'
  );

-- Permitir atualização de arquivos para usuários autenticados no bucket 'produtos'
create policy "Permitir atualização de produtos para usuários autenticados" on storage.objects
  for update
  using (
    bucket_id = 'produtos'
    and auth.role() = 'authenticated'
  );

-- Permitir deleção de arquivos para usuários autenticados no bucket 'produtos'
create policy "Permitir deleção de produtos para usuários autenticados" on storage.objects
  for delete
  using (
    bucket_id = 'produtos'
    and auth.role() = 'authenticated'
  );