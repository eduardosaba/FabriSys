-- Habilitar extensões necessárias
create extension if not exists "uuid-ossp";

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('admin', 'gerente', 'operador')),
  name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create system_settings table
create table if not exists public.system_settings (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.system_settings enable row level security;

-- Delete existing settings (para evitar conflitos)
delete from public.system_settings where key = 'theme';

-- Insert default settings
insert into public.system_settings (key, value) 
values (
  'theme',
  '{
    "name": "FabriSys",
    "logo_url": "/logo.png",
    "primary_color": "#2563eb",
    "secondary_color": "#4f46e5",
    "accent_color": "#f97316",
    "background_color": "#ffffff",
    "text_color": "#111827",
    "font_family": "Inter",
    "border_radius": "0.5rem"
  }'::jsonb
);

-- Drop existing policies (para evitar conflitos)
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Settings viewable by authenticated users" on public.system_settings;
drop policy if exists "Settings editable by admins" on public.system_settings;

-- Create RLS policies

-- Profiles policies
create policy "Public profiles are viewable by everyone" 
on public.profiles for select 
using (true);

create policy "Users can update own profile" 
on public.profiles for update 
using (auth.uid() = id);

-- System settings policies
create policy "Settings viewable by authenticated users" 
on public.system_settings for select 
using (auth.role() = 'authenticated');

create policy "Settings editable by admins" 
on public.system_settings for all 
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  )
);

-- Drop existing trigger and function (para evitar conflitos)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Functions
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, name)
  values (
    new.id,
    'operador',  -- default role
    coalesce(new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();