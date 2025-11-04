import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testServiceKey() {
  console.log('🔑 Testando chave de serviço...\n');

  console.log('SUPABASE_SERVICE_ROLE_KEY existe:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('Comprimento:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ Chave de serviço não encontrada');
    return;
  }

  // Testar acesso à Admin API
  try {
    console.log('\n🔍 Testando acesso à Admin API...');

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });

    console.log('Status da resposta:', response.status);

    if (response.ok) {
      const users = await response.json();
      console.log('✅ Acesso à Admin API OK');
      console.log('Usuários encontrados:', Array.isArray(users) ? users.length : 'N/A');
    } else {
      const error = await response.text();
      console.log('❌ Erro na Admin API:', error);
    }
  } catch (err) {
    console.log('❌ Erro ao testar Admin API:', err.message);
  }
}

testServiceKey();