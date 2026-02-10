import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente são injetadas no cliente pelo Next.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce', // Usar PKCE flow para melhor segurança
  },
  global: {
    // Workaround: garantir um Accept amplo para evitar 406 em alguns ambientes
    // (em alguns dev-servers o header Accept pode ser alterado; ajuste conforme necessário)
    headers: {
      // PostgREST espera JSON — incluir explicitamente para evitar 406
      Accept: 'application/json, text/plain, */*',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Limitar eventos para evitar sobrecarga
    },
  },
});
