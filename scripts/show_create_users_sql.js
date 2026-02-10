import fs from 'fs';
import path from 'path';

function main() {
  const sqlPath = path.join(process.cwd(), 'scripts', 'create_test_users.sql');

  if (!fs.existsSync(sqlPath)) {
    console.error('Arquivo SQL não encontrado:', sqlPath);
    return;
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('=== SQL PARA CRIAR USUÁRIOS DE TESTE ===');
  console.log('');
  console.log('1. Acesse o painel do Supabase: https://supabase.com/dashboard');
  console.log('2. Selecione seu projeto');
  console.log('3. Vá para SQL Editor > New Query');
  console.log('4. Cole e execute o SQL abaixo:');
  console.log('');
  console.log('--- INÍCIO DO SQL ---');
  console.log(sql);
  console.log('--- FIM DO SQL ---');
  console.log('');
  console.log('Após executar, teste o login com:');
  console.log('- Admin: sababrtv@gmail.com / admin123');
  console.log('- Fábrica: eduardosaba.rep@gmail.com / fabrica123');
  console.log('- PDV: eduardosaba@uol.com / pdv123');
}

main();
