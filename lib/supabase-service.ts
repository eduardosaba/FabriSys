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
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey // chave mestra - **server only**
  );
};

export async function fetchSystemTheme() {
  // Em ambientes de desenvolvimento locais sem chave de service role,
  // evitamos lançar erro 500 durante SSR e retornamos configurações vazias.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!serviceKey) {
    // Não usar console.error para não poluir logs em excesso; warn é suficiente.
    console.warn('fetchSystemTheme: SUPABASE service role key not found; returning empty config');

    // Retornar configurações padrão mínimas para evitar que o SSR quebre
    // Forma: array de { chave, valor } para manter compatibilidade com quem consome
    const defaults = [
      { chave: 'theme_primary_color', valor: '#2563eb' },
      { chave: 'theme_secondary_color', valor: '#64748b' },
      { chave: 'theme_bg_color', valor: '#f8fafc' },
      { chave: 'theme_sidebar_color', valor: '#0f172a' },
      { chave: 'company_logo_url', valor: null },
      { chave: 'logo_url', valor: '/logo.png' },
    ];

    return defaults;
  }

  const supabase = getServiceSupabase();
  const { data } = await supabase.from('configuracoes_sistema').select('chave,valor');
  return data || [];
}
