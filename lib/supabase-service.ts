import { createClient } from '@supabase/supabase-js';

// Este cliente ignora RLS e Cookies - use APENAS no servidor para dados públicos/config
export const getServiceSupabase = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE is not defined in environment'
    );
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey // chave mestra - **server only**
  );
};

export async function fetchSystemTheme() {
  const supabase = getServiceSupabase();

  const { data } = await supabase.from('configuracoes_sistema').select('chave,valor');

  return data || [];
}
