import fs from 'fs';
import path from 'path';

function main() {
  const migrationPath = path.join(process.cwd(), 'migrations', '020_fix_profiles_rls_policies.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('Arquivo de migração não encontrado:', migrationPath);
    return;
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('=== SQL PARA EXECUTAR NO SUPABASE ===');
  console.log('');
  console.log('1. Acesse o painel do Supabase: https://supabase.com/dashboard');
  console.log('2. Selecione seu projeto');
  console.log('3. Vá para SQL Editor > New Query');
  console.log('4. Cole o SQL abaixo e execute:');
  console.log('');
  console.log('--- INÍCIO DO SQL ---');
  console.log(sql);
  console.log('--- FIM DO SQL ---');
  console.log('');
  console.log('Após executar, teste novamente o login no aplicativo.');
}

main();