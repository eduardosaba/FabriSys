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
  const createSafeStorage = () => {
    const memoryStore = new Map<string, string>();

    const getCookie = (name: string): string | null => {
      try {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(
          new RegExp('(?:^|; )' + encodeURIComponent(name).replace(/[-.+*]/g, '\\$&') + '=([^;]*)')
        );
        return match ? decodeURIComponent(match[1]) : null;
      } catch (e) {
        void e;
        return null;
      }
    };

    const setCookie = (name: string, value: string) => {
      try {
        if (typeof document === 'undefined') return;
        const d = new Date();
        d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);
        document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
      } catch (e) {
        void e;
      }
    };

    const removeCookie = (name: string) => {
      try {
        if (typeof document === 'undefined') return;
        document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
      } catch (e) {
        void e;
      }
    };

    return {
      getItem: (key: string): string | null => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const val = window.localStorage.getItem(key);
            if (val !== null) return val;
          }
        } catch (e) {
          // Fallback para navegadores Android/WebViews com restrições de localStorage
        }
        const cookieVal = getCookie(key);
        if (cookieVal !== null) return cookieVal;
        return memoryStore.get(key) ?? null;
      },
      setItem: (key: string, value: string): void => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
          }
        } catch (e) {
          // Fallback
        }
        setCookie(key, value);
        memoryStore.set(key, value);
      },
      removeItem: (key: string): void => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
          }
        } catch (e) {
          // Fallback
        }
        removeCookie(key);
        memoryStore.delete(key);
      },
    };
  };

  const getClient = (): SupabaseClient => {
    if (typeof globalThis !== 'undefined' && (globalThis as any).__SUPABASE_CLIENT__) {
      return (globalThis as any).__SUPABASE_CLIENT__ as SupabaseClient;
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: createSafeStorage(),
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
