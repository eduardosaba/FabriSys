import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testSystem() {
  console.log('🔍 Testando sistema após correção das políticas RLS...\n');

  // Teste 1: Buscar tema (system_settings)
  console.log('1. Testando busca de tema...');
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    const { error: themeError } = await anonClient
      .from('system_settings')
      .select('value')
      .eq('key', 'theme')
      .single();

    if (themeError) {
      console.log('❌ Erro ao buscar tema:', themeError.message);
    } else {
      console.log('✅ Tema encontrado com sucesso');
    }
  } catch (err) {
    console.log('❌ Erro inesperado ao buscar tema:', err.message);
  }

  // Teste 2: Verificar usuários de teste
  console.log('\n2. Verificando usuários de teste...');
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const testUsers = [
    { email: 'sababrtv@gmail.com', role: 'admin' },
    { email: 'eduardosaba.rep@gmail.com', role: 'fabrica' },
    { email: 'eduardosaba@uol.com', role: 'pdv' }
  ];

  for (const user of testUsers) {
    try {
      const { data: profile, error } = await serviceClient
        .from('profiles')
        .select('id, role, nome, email')
        .eq('email', user.email)
        .single();

      if (error) {
        console.log(`❌ Erro ao buscar perfil ${user.email}:`, error.message);
      } else if (profile) {
        console.log(`✅ Usuário ${user.email} encontrado - Role: ${profile.role}`);
      } else {
        console.log(`❌ Usuário ${user.email} não encontrado`);
      }
    } catch (err) {
      console.log(`❌ Erro inesperado ao buscar ${user.email}:`, err.message);
    }
  }

  // Teste 3: Tentar login (simulado)
  console.log('\n3. Testando login simulado...');
  console.log('Para testar o login real, acesse http://localhost:3000/login');
  console.log('Use as credenciais:');
  console.log('- Admin: sababrtv@gmail.com / admin123');
  console.log('- Fábrica: eduardosaba.rep@gmail.com / fabrica123');
  console.log('- PDV: eduardosaba@uol.com / pdv123');

  console.log('\n🎯 Se todos os testes passarem, o sistema deve funcionar corretamente!');
}

testSystem();