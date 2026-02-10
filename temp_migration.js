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
  const migrationPath = path.join(process.cwd(), 'migrations', '041_add_master_role.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('Arquivo de migração não encontrado:', migrationPath);
    return;
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log('Executando migração 041_add_master_role.sql...');

  const success = await runMigrationSQL(sql);

  if (success) {
    console.log('Migração 041 aplicada com sucesso!');
  } else {
    console.log('Falha na migração 041. Execute manualmente no painel do Supabase.');
  }
}

main();
