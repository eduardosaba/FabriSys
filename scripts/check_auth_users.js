import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

(async () => {
  try {
    console.log('🔍 Verificando status dos usuários na tabela auth.users...\n');

    // IDs dos usuários de teste
    const userIds = [
      '972cd273-7812-487d-a24a-a43cffda65af', // sababrtv@gmail.com
      '910a58fc-776a-4466-afcb-0c1421eac7e5', // eduardosaba.rep@gmail.com
      'f53c6333-9759-4d18-be45-387325ea9638'  // eduardosaba@uol.com
    ];

    for (const userId of userIds) {
      try {
        console.log(`Verificando usuário ${userId}...`);

        // Tentar obter informações do usuário via Admin API
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          }
        });

        if (response.ok) {
          const userData = await response.json();
          console.log(`✅ Usuário encontrado:`);
          console.log(`   Email: ${userData.email}`);
          console.log(`   Email confirmado: ${userData.email_confirmed_at ? 'Sim' : 'Não'}`);
          console.log(`   Criado em: ${userData.created_at}`);
          console.log(`   Último login: ${userData.last_sign_in_at || 'Nunca'}`);
        } else {
          console.log(`❌ Erro ao buscar usuário: ${response.status} ${response.statusText}`);
        }

      } catch (err) {
        console.log(`❌ Erro inesperado: ${err.message}`);
      }
      console.log('');
    }

  } catch (err) {
    console.error('Erro geral:', err);
  }
})();