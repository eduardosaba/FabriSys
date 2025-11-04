import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProfiles() {
  console.log('🔍 Verificando perfis na tabela profiles...\n');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, created_at, updated_at');

  if (error) {
    console.error('❌ Erro ao buscar perfis:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ Nenhum perfil encontrado.');
    return;
  }

  console.log(`Encontrados ${data.length} perfis:\n`);
  data.forEach((profile, index) => {
    console.log(`${index + 1}. ID: ${profile.id}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Criado em: ${profile.created_at}`);
    console.log(`   Atualizado em: ${profile.updated_at}`);
    console.log('');
  });
}

checkProfiles();