-- Migration: Permite a role 'express' e 'pdv_simples' na tabela de perfis (profiles)

-- 1. Remove restrição antiga se existir
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Adiciona a nova restrição de roles incluindo 'express' e 'pdv_simples'
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('master', 'admin', 'gerente', 'compras', 'fabrica', 'pdv', 'user', 'express', 'pdv_simples'));

-- 3. Exemplo de comando para atribuir o perfil express a um e-mail cadastrado:
-- UPDATE public.profiles SET role = 'express' WHERE email = 'larissa@confectio.com.br';
