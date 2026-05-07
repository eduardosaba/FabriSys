import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

declare global {
  var __SUPABASE_CLIENT__: SupabaseClient | undefined;
}

let supabase: any = null;

if (!supabaseUrl || !supabaseAnonKey) {
  // Ambiente sem variáveis públicas do Supabase (ex: testes unitários ou build).
  // Evita lançar erro em tempo de importação para não quebrar páginas que importam o cliente.
  // Fornece um cliente fallback que retorna erros previsíveis em operações.

  console.warn(
    'NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas — usando cliente fallback'
  );

  const dummy: any = {
    from: () => ({
      select: async () => ({ data: null, error: new Error('supabase não configurado') }),
      insert: async () => ({ data: null, error: new Error('supabase não configurado') }),
      update: async () => ({ data: null, error: new Error('supabase não configurado') }),
      delete: async () => ({ data: null, error: new Error('supabase não configurado') }),
      rpc: async () => ({ data: null, error: new Error('supabase não configurado') }),
      maybeSingle: async () => ({ data: null, error: new Error('supabase não configurado') }),
      limit: () => ({
        maybeSingle: async () => ({ data: null, error: new Error('supabase não configurado') }),
      }),
      eq: () => ({
        select: async () => ({ data: null, error: new Error('supabase não configurado') }),
      }),
      order: () => ({
        select: async () => ({ data: null, error: new Error('supabase não configurado') }),
      }),
    }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
    auth: { getUser: async () => ({ data: null, error: new Error('supabase não configurado') }) },
  };

  supabase = dummy;
} else {
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

  supabase = getClient();
}

export { supabase };
export default supabase;
