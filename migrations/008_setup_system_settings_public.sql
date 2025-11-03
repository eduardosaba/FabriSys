-- Criação da tabela system_settings se não existir
create table if not exists public.system_settings (
    id uuid default uuid_generate_v4() primary key,
    key text not null unique,
    value jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Permitir acesso público temporariamente (até implementar autenticação)
alter table public.system_settings enable row level security;

create policy "Permitir leitura pública temporária"
on public.system_settings for select
to public
using (true);

create policy "Permitir inserção pública temporária"
on public.system_settings for insert
to public
with check (true);

create policy "Permitir atualização pública temporária"
on public.system_settings for update
to public
using (true);

-- Trigger para atualizar o updated_at automaticamente
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

create trigger set_updated_at
    before update on public.system_settings
    for each row
    execute function public.handle_updated_at();