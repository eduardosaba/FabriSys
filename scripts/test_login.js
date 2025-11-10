import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  try {
    console.log('🔍 Verificando usuários na tabela auth.users...\n');

    // Tentar fazer login com cada usuário de teste
    const testUsers = [
      { email: 'sababrtv@gmail.com', password: 'admin123', role: 'admin' },
      { email: 'eduardosaba.rep@gmail.com', password: 'fabrica123', role: 'fabrica' },
      { email: 'eduardosaba@uol.com', password: 'pdv123', role: 'pdv' },
    ];

    for (const user of testUsers) {
      try {
        console.log(`Testando login para ${user.email}...`);
        const res = await supabase.auth.signInWithPassword({
          email: user.email,
          password: user.password,
        });

        if (res.error) {
          console.error('❌ Erro ao logar:', res.error.message);
        } else {
          console.log('✅ Login bem-sucedido:', res.data.user.email);
          // Fazer logout após o teste
          await supabase.auth.signOut();
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
