import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = typeof cookies === 'function' ? await cookies() : cookies;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return (cookieStore as any).get?.(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            (cookieStore as any).set({ name, value, ...options });
          } catch (error) {
            // Ignore when called in RSC that only read data
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            (cookieStore as any).set({ name, value: '', ...options });
          } catch (error) {
            // Ignore when called in RSC that only read data
          }
        },
      },
    }
  );
}

export default createClient;
