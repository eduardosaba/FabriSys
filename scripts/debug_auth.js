import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const _supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAuthUsers() {
  console.log('🔍 Verificando usuários na tabela auth.users...\n');

  const userIds = [
    '972cd273-7812-487d-a24a-a43cffda65af', // sababrtv@gmail.com
    '910a58fc-776a-4466-afcb-0c1421eac7e5', // eduardosaba.rep@gmail.com
    'f53c6333-9759-4d18-be45-387325ea9638'  // eduardosaba@uol.com
  ];

  for (const userId of userIds) {
    try {
      console.log(`Verificando usuário ${userId}...`);

      // Usar fetch direto para acessar a tabela auth.users (requer service role)
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ Usuário encontrado:');
        console.log(`   Email: ${userData.email}`);
        console.log(`   Email confirmado: ${userData.email_confirmed_at ? 'Sim' : 'Não'}`);
        console.log(`   Criado em: ${userData.created_at}`);
        console.log(`   Último login: ${userData.last_sign_in_at || 'Nunca'}`);
      } else {
        console.log(`❌ Usuário não encontrado: ${response.status} ${response.statusText}`);
      }

    } catch (err) {
      console.log(`❌ Erro ao verificar usuário: ${err.message}`);
    }
    console.log('');
  }
}

async function testLogin() {
  console.log('🔑 Testando login...\n');

  const testUsers = [
    { email: 'sababrtv@gmail.com', password: 'admin123' },
    { email: 'eduardosaba.rep@gmail.com', password: 'fabrica123' },
    { email: 'eduardosaba@uol.com', password: 'pdv123' }
  ];

  for (const user of testUsers) {
    try {
      console.log(`Testando login: ${user.email}`);

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Login bem-sucedido!');
        console.log(`   Access Token: ${data.access_token ? 'Presente' : 'Ausente'}`);
      } else {
        console.log(`❌ Login falhou: ${data.error_description || data.msg || 'Erro desconhecido'}`);
      }

    } catch (err) {
      console.log(`❌ Erro: ${err.message}`);
    }
    console.log('');
  }
}

async function main() {
  await checkAuthUsers();
  await testLogin();
}

main();