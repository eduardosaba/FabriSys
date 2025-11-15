import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testAuth() {
  console.log('🔍 Testando autenticação no Supabase...\n');

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Erro: Variáveis de ambiente não encontradas');
    return;
  }

  // Testar login com cada usuário
  const users = [
    { email: 'sababrtv@gmail.com', password: 'admin123' },
    { email: 'eduardosaba.rep@gmail.com', password: 'fabrica123' },
    { email: 'eduardosaba@uol.com', password: 'pdv123' },
  ];

  for (const user of users) {
    try {
      console.log(`📧 Tentando login com ${user.email}...`);

      // Tentar login usando a chave anônima
      const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
        }),
      });

      const loginData = await loginRes.json();

      if (loginRes.ok) {
        console.log('✅ Login bem-sucedido!');
        console.log('   Access Token:', loginData.access_token ? 'Presente' : 'Ausente');
        console.log('   Refresh Token:', loginData.refresh_token ? 'Presente' : 'Ausente');

        // Tentar buscar o perfil usando o token de acesso
        const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${loginData.access_token}`,
          },
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          console.log('✅ Perfil encontrado:', profileData);
        } else {
          console.log('❌ Erro ao buscar perfil:', await profileRes.text());
        }
      } else {
        console.log('❌ Login falhou:', loginData.error_description || loginData.msg);
      }

      console.log(''); // linha em branco para separar
    } catch (err) {
      console.log('❌ Erro inesperado:', err instanceof Error ? err.message : String(err));
      console.log('');
    }
  }
}

testAuth();
