-- Migração para atualizar perfil do usuário eduardosaba@uol.com.br para role 'master'

-- Atualizar o perfil do usuário específico para role 'master'
UPDATE profiles
SET role = 'master', updated_at = NOW()
WHERE email = 'eduardosaba@uol.com.br';

-- Verificar se a atualização foi bem-sucedida
-- (Este comentário serve apenas para documentação - a atualização acima já foi executada)