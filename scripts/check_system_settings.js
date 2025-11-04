import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    console.log('Verificando tabela system_settings...');
    const { data, error } = await supabase.from('system_settings').select('*');
    if (error) {
      console.error('Erro:', error);
    } else {
      console.log('Registros encontrados:', data.length);
      console.log('Dados:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Erro geral:', err);
  }
})();