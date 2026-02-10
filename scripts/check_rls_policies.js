import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    console.log('Verificando políticas RLS da tabela system_settings...');

    // Testar leitura com usuário anônimo (sem autenticação)
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    console.log('Testando leitura com chave anônima...');
    const { data: anonData, error: anonError } = await anonClient
      .from('system_settings')
      .select('value')
      .eq('key', 'theme')
      .single();

    if (anonError) {
      console.error('Erro com chave anônima:', anonError);
    } else {
      console.log('Sucesso com chave anônima:', anonData ? 'Dados retornados' : 'Nenhum dado');
    }

    // Testar leitura com service role
    console.log('Testando leitura com service role...');
    const { data: serviceData, error: serviceError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'theme')
      .single();

    if (serviceError) {
      console.error('Erro com service role:', serviceError);
    } else {
      console.log('Sucesso com service role:', serviceData ? 'Dados retornados' : 'Nenhum dado');
    }
  } catch (err) {
    console.error('Erro geral:', err);
  }
})();
