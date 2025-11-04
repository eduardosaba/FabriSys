import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  try {
    console.log('🔄 Verificando se o servidor Supabase está acessível...');
    
    // Testar conexão com um select simples
    const { data: healthCheck, error: healthError } = await supabase
      .from('system_settings')
      .select('id')
      .limit(1);

    if (healthError) {
      console.log('❌ Erro de conexão:', healthError.message);
      return;
    }

    console.log('✅ Conexão com Supabase OK');
    console.log('📊 Health check result:', healthCheck ? 'Dados encontrados' : 'Nenhum dado encontrado');
    console.log('\n🔑 Tentando login com cada usuário de teste...');

    const testUsers = [
      { email: 'sababrtv@gmail.com', password: 'admin123', role: 'admin' },
      { email: 'eduardosaba.rep@gmail.com', password: 'fabrica123', role: 'fabrica' },
      { email: 'eduardosaba@uol.com', password: 'pdv123', role: 'pdv' }
    ];

    for (const user of testUsers) {
      try {
        console.log(`\n📧 Testando ${user.email}...`);
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: user.password
        });

        if (error) {
          console.log(`❌ Erro no login:`, error.message);
          
          // Verificar se o usuário existe
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', user.email)
            .single();

          if (userError) {
            console.log('❌ Usuário não encontrado no banco');
          } else {
            console.log('✅ Usuário existe no banco com os dados:', userData);
          }
          
        } else {
          console.log('✅ Login bem-sucedido!');
          console.log('ID:', data.user?.id);
          console.log('Email confirmado:', data.user?.email_confirmed_at ? 'Sim' : 'Não');
          
          // Verificar perfil
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user?.id)
            .single();
            
          if (profileError) {
            console.log('❌ Erro ao buscar perfil:', profileError.message);
          } else {
            console.log('Role:', profile.role);
          }
        }

      } catch (err) {
        console.log('❌ Erro inesperado:', err.message);
      }
    }

  } catch (err) {
    console.error('Erro geral:', err);
  }
})();