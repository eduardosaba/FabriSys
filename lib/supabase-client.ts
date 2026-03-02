import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'As variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias'
  );
}

declare global {
  var __SUPABASE_CLIENT__: SupabaseClient | undefined;
}

const getClient = (): SupabaseClient => {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__SUPABASE_CLIENT__) {
    return (globalThis as any).__SUPABASE_CLIENT__ as SupabaseClient;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? (window.localStorage as any) : undefined,
      flowType: 'pkce',
    },
    global: { headers: { Accept: 'application/json, text/plain, */*' } },
    realtime: { params: { eventsPerSecond: 10 } },
  });

  try {
    (globalThis as any).__SUPABASE_CLIENT__ = client;
  } catch (e) {
    // ignore (some environments may forbid writing to globalThis)
  }

  return client;
};

export const supabase: SupabaseClient = getClient();

export default supabase;
