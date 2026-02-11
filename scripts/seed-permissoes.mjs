import { createClient } from '@supabase/supabase-js';

// Uso: set SUPABASE_URL and SUPABASE_SERVICE_ROLE in env, then run:
// powershell: $env:SUPABASE_URL='https://xyz.supabase.co'; $env:SUPABASE_SERVICE_ROLE='...'; node scripts/seed-permissoes.mjs

const SUPABASE_URL = process.env.SUPABASE_URL;
// Accept either SUPABASE_SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY for flexibility
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Erro: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE (ou SUPABASE_SERVICE_ROLE_KEY) como variáveis de ambiente.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function run() {
  try {
    const defaultValue = {
      master: ['all'],
      admin: ['all'],
      gerente: [],
      compras: [],
      fabrica: [],
      pdv: ['pdv', 'relatorios'],
    };

    const { data, error } = await supabase
      .from('configuracoes_sistema')
      .upsert({
        chave: 'permissoes_acesso',
        valor: JSON.stringify(defaultValue),
        descricao: 'Permissões iniciais geradas por seed',
      })
      .select();

    if (error) {
      console.error('Erro ao aplicar seed:', error);
      process.exit(1);
    }

    console.log('Seed aplicada com sucesso:', data || 'OK');
    process.exit(0);
  } catch (err) {
    console.error('Erro inesperado:', err);
    process.exit(1);
  }
}

run();
