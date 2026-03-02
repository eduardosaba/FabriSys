declare module '@supabase/auth-helpers-nextjs' {
  // Declaração mínima para evitar erros de tipo em tempo de build.
  export function createServerComponentClient(opts?: any, config?: any): any;
  export function createServerActionClient(opts?: any, config?: any): any;
}
