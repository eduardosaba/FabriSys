import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function _checkUserExists(userId) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

async function updateUserPassword(userId, password) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          password: password,
        }),
      }
    );

    if (response.ok) {
      console.log(`✅ Senha atualizada para usuário ${userId}`);
      return true;
    } else {
      const error = await response.json();
      console.log(`❌ Erro ao atualizar senha ${userId}:`, error.msg || error.error_description);
      return false;
    }
  } catch (err) {
    console.log(`❌ Erro ao atualizar senha ${userId}:`, err.message);
    return false;
  }
}

async function createUser(userData) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        id: userData.id,
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: { nome: userData.nome },
      }),
    });

    if (response.ok) {
      console.log(`✅ Usuário ${userData.email} criado com sucesso`);
      return true;
    } else {
      // Tentar ler corpo como JSON ou texto para diagnosticar o erro
      let bodyText;
      try {
        bodyText = await response.text();
      } catch (e) {
        bodyText = String(e);
      }
      let parsed;
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        parsed = null;
      }

      console.log(`❌ Erro ao criar ${userData.email}: status=${response.status}`);
      console.log('Resposta da API:', bodyText);

      // Se o usuário já existe, tentar atualizar a senha
      const msg = parsed?.msg || parsed?.error_description || bodyText || '';
      if (String(msg).toLowerCase().includes('already exists')) {
        console.log(`🔄 Usuário ${userData.email} já existe, atualizando senha...`);
        return await updateUserPassword(userData.id, userData.password);
      }

      return false;
    }
  } catch (err) {
    console.log(`❌ Erro ao criar ${userData.email}:`, err.message);
    return false;
  }
}

async function createProfile(profileData) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(profileData),
    });

    if (response.ok) {
      console.log(`✅ Perfil ${profileData.email} criado/atualizado`);
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ Erro ao criar perfil ${profileData.email}:`, error);
      return false;
    }
  } catch (err) {
    console.log(`❌ Erro ao criar perfil ${profileData.email}:`, err.message);
    return false;
  }
}

async function createUsers() {
  console.log('🚀 Criando usuários de teste via Admin API...\n');

  const users = [
    {
      id: '972cd273-7812-487d-a24a-a43cffda65af',
      email: 'sababrtv@gmail.com',
      password: 'admin123',
      nome: 'Administrador',
    },
    {
      id: '910a58fc-776a-4466-afcb-0c1421eac7e5',
      email: 'eduardosaba.rep@gmail.com',
      password: 'fabrica123',
      nome: 'Usuario Fabrica',
    },
    {
      id: 'f53c6333-9759-4d18-be45-387325ea9638',
      email: 'eduardosaba@uol.com',
      password: 'pdv123',
      nome: 'Usuario PDV',
    },
  ];

  for (const user of users) {
    // Criar usuário na auth
    await createUser(user);

    // Criar perfil
    await createProfile({
      id: user.id,
      role: user.email.includes('admin')
        ? 'admin'
        : user.email.includes('fabrica')
          ? 'fabrica'
          : 'pdv',
      nome: user.nome,
      email: user.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  console.log('\n🎉 Processo concluído!');
  console.log('\n📋 Credenciais de teste:');
  console.log('Admin: sababrtv@gmail.com / admin123');
  console.log('Fábrica: eduardosaba.rep@gmail.com / fabrica123');
  console.log('PDV: eduardosaba@uol.com / pdv123');

  console.log('\n🔄 Testando login...');
  await testLogin();
}

async function testLogin() {
  const testUsers = [
    { email: 'sababrtv@gmail.com', password: 'admin123' },
    { email: 'eduardosaba.rep@gmail.com', password: 'fabrica123' },
    { email: 'eduardosaba@uol.com', password: 'pdv123' },
  ];

  for (const user of testUsers) {
    try {
      console.log(`\nTestando ${user.email}...`);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email: user.email,
            password: user.password,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Login bem-sucedido!');
      } else {
        console.log(`❌ Login falhou: ${data.error_description || data.msg}`);
      }
    } catch (err) {
      console.log(`❌ Erro: ${err.message}`);
    }
  }
}

createUsers();
