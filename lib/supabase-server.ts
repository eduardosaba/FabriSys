import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Factory para criar cliente Supabase no servidor usando auth-helpers
export async function createClient() {
  // `cookies()` pode ser assíncrono dependendo da versão do Next;
  // aguarde se for uma função que retorna uma Promise.
  // Normalize `cookies` to support both calling conventions used by
  // different versions of auth-helpers (some expect a function, some an
  // object with `.get()`). Resolve the actual cookie object first,
  // then create a callable function that also exposes `.get`.
  const cookieObj = typeof cookies === 'function' ? await cookies() : cookies;

  const cookieBridge: any = function () {
    return cookieObj;
  };
  // copy commonly used methods to the bridge so both `cookies()` and
  // `cookies.get()` callers work. Use `any` casts to satisfy differing
  // type signatures across Next versions.
  cookieBridge.get = (...args: any[]) => (cookieObj as any).get?.(...(args as any));
  cookieBridge.set = (...args: any[]) => (cookieObj as any).set?.(...(args as any));

  return createServerComponentClient(
    { cookies: cookieBridge },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
  );
}

export default createClient;
