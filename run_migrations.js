import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigrationSQL(sql, migrationName) {
  try {
    console.log(`Executando ${migrationName}...`);
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro em ${migrationName}:`, response.status, errorText);
      return false;
    }

    await response.json();
    console.log(`✅ ${migrationName} executada com sucesso!`);
    return true;
  } catch (err) {
    console.error(`❌ Erro ao executar ${migrationName}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando aplicação das migrações atualizadas...');

  // 1. Adicionar role master ao sistema
  const migrationPath041 = path.join(process.cwd(), 'migrations', '041_add_master_role.sql');
  if (fs.existsSync(migrationPath041)) {
    const sql041 = fs.readFileSync(migrationPath041, 'utf8');
    const success041 = await runMigrationSQL(sql041, '041_add_master_role.sql');
    if (!success041) {
      console.log('❌ Falha crítica na migração 041. Abortando...');
      return;
    }
  }

  // 2. Criar usuário master
  const migrationPath043 = path.join(process.cwd(), 'migrations', '043_create_master_user.sql');
  if (fs.existsSync(migrationPath043)) {
    const sql043 = fs.readFileSync(migrationPath043, 'utf8');
    const success043 = await runMigrationSQL(sql043, '043_create_master_user.sql');
    if (!success043) {
      console.log('⚠️  Migração 043 falhou, mas continuando com usuários de teste...');
    }
  }

  // 3. Criar usuários de teste (atualizados)
  const migrationPath019 = path.join(process.cwd(), 'migrations', '019_create_test_users.sql');
  if (fs.existsSync(migrationPath019)) {
    const sql019 = fs.readFileSync(migrationPath019, 'utf8');
    const success019 = await runMigrationSQL(sql019, '019_create_test_users.sql');
    if (!success019) {
      console.log('⚠️  Migração 019 falhou, mas algumas operações podem ter sido bem-sucedidas.');
    }
  }

  console.log('\n🎉 Processo de migração concluído!');
  console.log('\n📋 Usuários disponíveis para teste:');
  console.log('👑 Master: eduardosaba@uol.com.br / Sp230407@');
  console.log('👨‍💼 Admin: sababrtv@gmail.com / admin123');
  console.log('🏭 Fábrica: eduardosaba.rep@gmail.com / fabrica123');
  console.log('🏪 PDV: eduardosaba84@gmail.com / pdv123');

  console.log(
    '\n💡 Dica: Se algum usuário já existia, a migração pula a criação mas atualiza o perfil se necessário.'
  );
}

main().catch((err) => {
  console.error('❌ Erro fatal no processo de migração:', err);
});
