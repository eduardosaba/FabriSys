import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigrationSQL(sql) {
  try {
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
      console.error('Erro na resposta:', response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log('Resultado da migração:', result);
    return true;
  } catch (err) {
    console.error('Erro ao executar SQL:', err);
    return false;
  }
}

async function main() {
  // Executar migração 041 primeiro
  const migrationPath041 = path.join(process.cwd(), 'migrations', '041_add_master_role.sql');

  if (!fs.existsSync(migrationPath041)) {
    console.error('Arquivo de migração 041 não encontrado:', migrationPath041);
    return;
  }

  const sql041 = fs.readFileSync(migrationPath041, 'utf8');
  console.log('Executando migração 041_add_master_role.sql...');

  const success041 = await runMigrationSQL(sql041);

  if (success041) {
    console.log('Migração 041 aplicada com sucesso!');

    // Executar migração 042
    const migrationPath042 = path.join(process.cwd(), 'migrations', '042_update_master_user.sql');

    if (!fs.existsSync(migrationPath042)) {
      console.error('Arquivo de migração 042 não encontrado:', migrationPath042);
      return;
    }

    const sql042 = fs.readFileSync(migrationPath042, 'utf8');
    console.log('Executando migração 042_update_master_user.sql...');

    const success042 = await runMigrationSQL(sql042);

    if (success042) {
      console.log('Migração 042 aplicada com sucesso!');
      console.log('Role master criado e atribuído ao usuário eduardosaba@uol.com.br');
    } else {
      console.log('Falha na migração 042. Execute manualmente no painel do Supabase.');
    }
  } else {
    console.log('Falha na migração 041. Execute manualmente no painel do Supabase.');
  }
}

main();
